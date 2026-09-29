import crypto from "node:crypto";

import { AuditAction, AuditEntityType, Prisma, PrismaClient } from "@generated/prisma/client";

import { env } from "@config";

import { StaffRepository } from "./staff.repository";
import { StaffRoleRepository } from "../staff-role/staff-role.repository";
import { MasterRepository } from "../master/master.repository";

import { AppError, ErrorCode } from "@errors";

import { CreateStaffDto } from "./staff.dto";
import { AuditService } from "@modules/audit/audit.service";
import { MailerService } from "mailer";
import { logger } from "@logger";
import { StaffMapper } from "./staff.mapper";
import { UpdateStaffDto } from "./staff.schema";
import { StaffListEntity } from "./staff.types";
import { AuthService } from "@modules/auth/auth.service";
import { NotificationService } from "@modules/notification/notification.service";
import { SessionService } from "@modules/session/session.service";
import { WebSocketPublisher } from "websocket";

export class StaffService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly staffRepository: StaffRepository,
        private readonly staffRoleRepository: StaffRoleRepository,
        private readonly masterRepository: MasterRepository,
        private readonly auditService: AuditService,
        private readonly mailerService: MailerService,
        private readonly authService: AuthService,
        private readonly notificationService: NotificationService,
        private readonly sessionService: SessionService,
    ) {}

    /** Notifies other active admins (excluding the actor) inside an open transaction. Caller must ping post-commit. */
    private async notifyOtherAdmins(
        excludingStaffId: number,
        data: { title: string; message: string; type: string; action_url?: string },
        tx: Prisma.TransactionClient,
    ) {
        const adminIds = await this.staffRepository.getActiveAdminIds(excludingStaffId, tx);
        await Promise.all(adminIds.map((adminId) => this.notificationService.notify(adminId, data, tx)));
        return adminIds;
    }

    public async createStaff(dto: CreateStaffDto, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const {
            first_name,
            last_name,
            username,
            email,
            mobile_number,
            gender_id,
            age,
            street_address,
            city,
            state,
            pincode,
            role_id,
        } = dto;

        // Check if username, email or phone already exist or not.
        const existingStaff = await this.staffRepository.findExistingStaff(
            username,
            email,
            mobile_number,
        );

        if (existingStaff) {
            if (existingStaff.username === username) {
                throw new AppError(409, ErrorCode.CONFLICT, "Username already exists.");
            }

            if (existingStaff.email === email) {
                throw new AppError(409, ErrorCode.CONFLICT, "Email already exists.");
            }

            if (existingStaff.mobile_number === mobile_number) {
                throw new AppError(409, ErrorCode.CONFLICT, "Mobile number already exists.");
            }
        }

        // Transaction
        const { staff, activationToken, assignedRole } = await this.prisma.$transaction(
            async (tx) => {
                const activationToken = crypto.randomBytes(32).toString("hex");
                const activationTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                const staff = await this.staffRepository.create(
                    {
                        first_name,
                        last_name,
                        username,
                        email,
                        password_hash: null,
                        mobile_number,
                        gender: {
                            connect: {
                                value_id: gender_id,
                            },
                        },
                        age,
                        street_address,
                        city,
                        state,
                        pincode,
                        is_account_activated: false,
                        activation_token: activationToken,
                        activation_token_expires_at: activationTokenExpiresAt,
                    },
                    tx,
                );

                const assignedRole = await this.staffRoleRepository.assignRole(
                    staff.staff_id,
                    role_id,
                    tx,
                );

                await this.auditService.log(
                    {
                        ...auditContext,

                        entity_type: AuditEntityType.STAFF,

                        entity_id: staff.staff_id.toString(),

                        action: AuditAction.CREATE,

                        old_values: {},

                        new_values: {
                            staff_id: staff.staff_id,
                            username: staff.username,
                            first_name: staff.first_name,
                            last_name: staff.last_name,
                            email: staff.email,
                            mobile_number: staff.mobile_number,
                        },
                    },
                    tx,
                );

                return { staff, activationToken, assignedRole };
            },
        );

        const activationLink = `${env.FRONTEND_URL}/activate-account?token=${activationToken}`;

        // Fire and forget email to avoid blocking the API response
        this.mailerService.sendStaffActivationMail({
            to: staff.email,
            firstName: staff.first_name,
            username: staff.username,
            activationLink,
        }).catch(error => {
            logger.error(error, "Failed to send staff activation email.");
        });

        WebSocketPublisher.staffUpdated(staff.staff_id, auditContext.performed_by_staff_id);

        return {
            staff_id: staff.staff_id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            username: staff.username,
            email: staff.email,
            mobile_number: staff.mobile_number,
            is_account_activated: staff.is_account_activated,
            is_disabled: staff.is_disabled,
            created_at: staff.created_at,
            role: {
                role_id: assignedRole.role.role_id,
                role_name: assignedRole.role.role_name,
            },
        };
    }

    public async getAllStaff(page?: number, limit?: number) {
        const { data, total } = await this.staffRepository.getAll(page, limit);

        return {
            data: StaffMapper.toList(data),
            total,
            page,
            limit,
        };
    }

    public async getStaffById(staffId: number) {
        const staff = await this.staffRepository.findById(staffId);

        if (!staff) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Staff not found.");
        }

        return StaffMapper.toDetailItem(staff);
    }

    // Update basic staff profile fields and log changes
    public async updateStaff(staffId: number, dto: UpdateStaffDto, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const existingStaff = await this.staffRepository.findById(staffId);
        if(!existingStaff) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Staff not found.");
        }

        const { ...primitiveData } = dto;
        
        if (Object.keys(primitiveData).length > 0) {
            // Extract old values for auditing
            const oldValues: Record<string, any> = {};
            for (const key of Object.keys(primitiveData)) {
                oldValues[key] = (existingStaff as any)[key];
            }

            await this.staffRepository.update(staffId, primitiveData);
            
            // Log exact changes
            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.STAFF,
                entity_id: staffId.toString(),
                action: AuditAction.UPDATE,
                old_values: oldValues,
                new_values: primitiveData as any,
            });

            WebSocketPublisher.staffUpdated(staffId, auditContext.performed_by_staff_id);
        }

        return await this.getStaffById(staffId);
    }

    // Update staff role assignments securely via transaction
    public async updateStaffRoles(staffId: number, roles: number[], auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const existingStaff = await this.staffRepository.findById(staffId);
        if (!existingStaff) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Staff not found.");
        }

        await this.prisma.$transaction(async (tx) => {
            // Verify provided roles exist
            const roleRecords = await this.masterRepository.getRolesByIds(roles, tx);

            if (roleRecords.length !== roles.length) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "One or more invalid roles provided.");
            }

            // Wipe old roles
            await this.staffRoleRepository.removeAllRolesForStaff(staffId, tx);

            // Insert new roles
            if (roleRecords.length > 0) {
                const roleIds = roleRecords.map(r => r.role_id);
                await this.staffRoleRepository.assignMultipleRoles(staffId, roleIds, tx);
            }

            // Audit the change
            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.STAFF,
                entity_id: staffId.toString(),
                action: AuditAction.UPDATE,
                old_values: { roles: existingStaff.staff_roles.map(r => r.role.role_id) },
                new_values: { roles },
            }, tx);
        });

        // Post-commit — the target staff member's client refetches /auth/me
        // instead of continuing to act on a stale role set. Also tells other
        // admins' staff/doctor list views to refetch — rolesUpdated alone
        // only reaches the affected staff member's own client.
        WebSocketPublisher.rolesUpdated(staffId);
        WebSocketPublisher.staffUpdated(staffId, auditContext.performed_by_staff_id);

        return await this.getStaffById(staffId);
    }

    public async disableStaff(staffId: number, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }): Promise<StaffListEntity> {
        let notifiedAdminIds: number[] = [];

        const data = await this.prisma.$transaction(async (tx) => {
            const staff = await this.staffRepository.disable(staffId, tx);

            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.STAFF,
                entity_id: staffId.toString(),
                action: AuditAction.DISABLE,
                old_values: { is_disabled: false },
                new_values: { is_disabled: true },
            }, tx);

            notifiedAdminIds = await this.notifyOtherAdmins(auditContext.performed_by_staff_id, {
                title: "Staff account disabled",
                message: `${staff.first_name} ${staff.last_name}'s account was disabled.`,
                type: "WARNING",
            }, tx);

            return staff;

        });

        // Post-commit, and not swallowed: a disabled account must not keep a live
        // session. If this throws the disable itself is already saved (and is
        // idempotent to retry); the session lookup also rejects disabled staff
        // as a safety net once a session falls out of the Redis cache.
        await this.sessionService.revokeAllSessionsForStaff(staffId);

        notifiedAdminIds.forEach((adminId) => this.notificationService.pingNew(adminId));
        WebSocketPublisher.staffUpdated(staffId, auditContext.performed_by_staff_id);

        return data;
    }

    public async restoreStaff(staffId: number, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }): Promise<StaffListEntity> {
        let notifiedAdminIds: number[] = [];

        const data = await this.prisma.$transaction(async (tx) => {
            const staff = await this.staffRepository.restore(staffId, tx);

            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.STAFF,
                entity_id: staffId.toString(),
                action: AuditAction.ENABLE,
                old_values: { is_disabled: true },
                new_values: { is_disabled: false },
            }, tx);

            notifiedAdminIds = await this.notifyOtherAdmins(auditContext.performed_by_staff_id, {
                title: "Staff account restored",
                message: `${staff.first_name} ${staff.last_name}'s account was restored.`,
                type: "SUCCESS",
            }, tx);

            return staff;

        });

        notifiedAdminIds.forEach((adminId) => this.notificationService.pingNew(adminId));
        WebSocketPublisher.staffUpdated(staffId, auditContext.performed_by_staff_id);

        return data;
    }

    public async unlockStaff(staffId: number, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }): Promise<StaffListEntity> {
        const staff = await this.prisma.$transaction(async (tx) => {
            const staff = await this.staffRepository.unlock(staffId, tx);

            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.STAFF,
                entity_id: staffId.toString(),
                action: AuditAction.ACCOUNT_UNLOCKED,
                new_values: { locked_until: null, failed_login_count: 0 },
            }, tx);

            return staff;
        });

        WebSocketPublisher.staffUpdated(staffId, auditContext.performed_by_staff_id);

        return staff;
    }

    public async deleteStaff(staffId: number, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const data = await this.prisma.$transaction(async (tx) => {
            const staff = await this.staffRepository.delete(staffId, tx);

            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.STAFF,
                entity_id: staffId.toString(),
                action: AuditAction.DELETE,
                old_values: { is_deleted: null },
                new_values: { is_deleted: staff.deleted_at },
            }, tx);

            return staff;
        });

        // Same reasoning as disableStaff: end any live sessions post-commit.
        await this.sessionService.revokeAllSessionsForStaff(staffId);

        WebSocketPublisher.staffUpdated(staffId, auditContext.performed_by_staff_id);

        return data;
    }

    public async bulkDisableStaff(staffIds: number[], auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const results = await Promise.allSettled(staffIds.map(id => this.disableStaff(id, auditContext)));
        return results;
    }

    public async bulkDeleteStaff(staffIds: number[], auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const results = await Promise.allSettled(staffIds.map(id => this.deleteStaff(id, auditContext)));
        return results;
    }

    public async triggerPasswordReset(staffId: number, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        const result = await this.authService.adminTriggerPasswordReset(staffId, { performed_by_staff_id: auditContext.performed_by_staff_id });

        await this.auditService.log({
            ...auditContext,
            entity_type: AuditEntityType.STAFF,
            entity_id: staffId.toString(),
            action: AuditAction.PASSWORD_RESET_REQUESTED,
            old_values: {},
            new_values: { event: "Admin triggered password reset" },
        });

        return result;
    }
}
