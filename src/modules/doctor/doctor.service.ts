import { PrismaClient } from "@generated/prisma/client";
import { DoctorRepository } from "./doctor.repository";
import { CreateDoctorDto } from "./doctor.dto";
import { UpdateDoctorDto } from "./doctor.schema";
import { AppError, ErrorCode } from "@errors";
import { StaffRepository } from "@modules/staff/staff.repository";
import { StaffRoleRepository } from "@modules/staff-role/staff-role.repository";
import { AuditService } from "@modules/audit/audit.service";
import { MailerService } from "mailer";
import { env } from "@config";
import crypto from "node:crypto";
import { AuditAction, AuditEntityType } from "@generated/prisma/client";
import { logger } from "@logger";

export class DoctorService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly doctorRepository: DoctorRepository,
        private readonly staffRepository: StaffRepository,
        private readonly staffRoleRepository: StaffRoleRepository,
        private readonly auditService: AuditService,
        private readonly mailerService: MailerService,
    ) {}

    public async getAllDoctors() {
        const doctors = await this.doctorRepository.getAllDoctors();
        return doctors.map(doctor => {
            const mappedDoctor = {
                ...doctor,
                roles: doctor.staff_roles.map((sr) => sr.role),
            };
            delete (mappedDoctor as any).staff_roles;
            return mappedDoctor;
        });
    }

    public async getDoctorById(staffId: number) {
        const doctor = await this.doctorRepository.findDoctorById(staffId);
        if (!doctor) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Doctor not found.");
        }
        
        // Map staff_roles to roles to match StaffDetail interface expected by frontend
        const mappedDoctor = {
            ...doctor,
            roles: doctor.staff_roles.map((sr) => sr.role),
        };
        delete (mappedDoctor as any).staff_roles;

        return mappedDoctor;
    }

    public async createDoctor(dto: CreateDoctorDto, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
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
            specialization,
            qualification,
            registration_number,
            biography,
            experience,
            is_visible_on_website,
            is_accepting_appointments,
            display_order,
        } = dto;

        // Check if username, email or phone already exist
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

                // Create Staff
                const staff = await this.staffRepository.create(
                    {
                        first_name,
                        last_name,
                        username,
                        email,
                        password_hash: null,
                        mobile_number,
                        gender: { connect: { value_id: gender_id } },
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

                // Assign Doctor Role (Role ID 2)
                const assignedRole = await this.staffRoleRepository.assignRole(
                    staff.staff_id,
                    2,
                    tx,
                );

                // Create Doctor Profile
                await this.doctorRepository.createDoctorProfile(
                    staff.staff_id,
                    {
                        specialization,
                        qualification,
                        registration_number,
                        biography,
                        experience,
                        is_visible_on_website,
                        is_accepting_appointments,
                        display_order,
                    },
                    tx
                );

                // Audit Log
                await this.auditService.log(
                    {
                        ...auditContext,
                        entity_type: AuditEntityType.DOCTOR,
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
                            specialization,
                        },
                    },
                    tx,
                );

                return { staff, activationToken, assignedRole };
            },
        );

        const activationLink = `${env.FRONTEND_URL}/activate-account?token=${activationToken}`;

        // Fire and forget email
        this.mailerService.sendStaffActivationMail({
            to: staff.email,
            firstName: staff.first_name,
            username: staff.username,
            activationLink,
        }).catch((error: unknown) => {
            logger.error(error, "Failed to send doctor activation email.");
        });

        return this.getDoctorById(staff.staff_id);
    }

    public async updateDoctor(staffId: number, dto: UpdateDoctorDto, auditContext: { performed_by_staff_id: number, ip_address: string, user_agent: string }) {
        // Find existing doctor
        const existingDoctor = await this.getDoctorById(staffId);

        const {
            specialization,
            qualification,
            registration_number,
            biography,
            experience,
            is_visible_on_website,
            is_accepting_appointments,
            display_order,
            ...staffPrimitiveData
        } = dto;

        const doctorProfileData = {
            specialization,
            qualification,
            registration_number,
            biography,
            experience,
            is_visible_on_website,
            is_accepting_appointments,
            display_order,
        };

        // Remove undefined fields
        Object.keys(doctorProfileData).forEach(key => doctorProfileData[key as keyof typeof doctorProfileData] === undefined && delete doctorProfileData[key as keyof typeof doctorProfileData]);

        await this.prisma.$transaction(async (tx) => {
            // Update staff primitives if any
            if (Object.keys(staffPrimitiveData).length > 0) {
                await this.staffRepository.update(staffId, staffPrimitiveData, tx);
            }

            // Update doctor profile if any
            if (Object.keys(doctorProfileData).length > 0) {
                await this.doctorRepository.updateDoctorProfile(staffId, doctorProfileData, tx);
            }

            // Audit
            await this.auditService.log({
                ...auditContext,
                entity_type: AuditEntityType.DOCTOR,
                entity_id: staffId.toString(),
                action: AuditAction.UPDATE,
                old_values: {}, // Simplified for brevity as per existing pattern
                new_values: dto as any,
            }, tx);
        });

        return this.getDoctorById(staffId);
    }
}
