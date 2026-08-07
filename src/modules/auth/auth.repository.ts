import { PrismaClient } from "@generated/prisma/client";

export class AuthRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async findStaffById(staffId: number) {
        return await this.prisma.staff.findUnique({
            where: {
                staff_id: staffId,
            },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                mobile_number: true,
                password_hash: true,
                is_disabled: true,
                deleted_at: true,
                is_account_activated: true,
            },
        });
    }

    public async findStaffForLogin(username: string) {
        return await this.prisma.staff.findUnique({
            where: {
                username,
            },
            select: {
                staff_id: true,
                first_name: true,
                username: true,
                email: true,
                password_hash: true,
                is_disabled: true,
                is_account_activated: true,
                deleted_at: true,
                failed_login_count: true,
                failed_login_window_started_at: true,
                locked_until: true,

                staff_roles: {
                    where: {
                        deleted_at: null,
                    },
                    select: {
                        is_default: true,
                        role: {
                            select: {
                                role_name: true,
                            },
                        },
                    },
                },
            },
        });
    }

    public async getStaffActivationDetail(activationToken: string) {
        return await this.prisma.staff.findUnique({
            where: {
                activation_token: activationToken,
            },
            select: {
                staff_id: true,
                first_name: true,
                username: true,
                activation_token_expires_at: true,
                activation_token: true,
            }
        });
    }

    public async activateStaffAccount(staff_id: number, hashedPassword: string) {
        return await this.prisma.staff.update({
            where: {
                staff_id: staff_id,
            },
            data: {
                activation_token: null,
                activation_token_expires_at: null,
                is_account_activated: true,
                password_hash: hashedPassword,
            },
        });
    }
    
    public async findStaffActivationDetails(staff_id: number) {
        return await this.prisma.staff.findUnique({
            where: {
                staff_id: staff_id,
            },
            select: {
                is_account_activated: true,
                is_disabled: true,
                deleted_at: true,
            }
        })
    }

    public async updateStaffActivation(staffId: number, activationToken: string, activationTokenExpiresAt: Date) {
        return await this.prisma.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                activation_token: activationToken,
                activation_token_expires_at: activationTokenExpiresAt,
                is_account_activated: false,
            },
            select: {
                staff_id: true,
                first_name: true,
                username: true,
                email: true,
                activation_token: true,
                activation_token_expires_at: true,
                is_account_activated: true,
            }
        });
    }

    public async getProfileDetail(staffId: number) {
        return await this.prisma.staff.findUnique({
            where: {
                staff_id: staffId
            },
            select: {
                username: true,
                staff_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                            }
                        }
                    }
                },
                first_name: true,
                last_name: true,
                email: true,
                mobile_number: true,
                is_disabled: true,
                deleted_at: true,
                pending_email: true,
            },
        });
    }

    public async updateProfile(staffId: number, firstName: string, lastName: string, mobileNumber: string) {
        return await this.prisma.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                first_name: firstName,
                last_name: lastName,
                mobile_number: mobileNumber,
            },
            select: {
                first_name: true,
                last_name: true,
                email: true,
                mobile_number: true,
            },
        });
    }

    public async changePassword(staffId: number, hashedPassword: string) {
        return await this.prisma.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                password_hash: hashedPassword,
            }
        });
    }

    public async findStaffByEmail(email: string) {
        return await this.prisma.staff.findFirst({
            where: {
                email,
                deleted_at: null,
                is_disabled: false,
            },
            select: {
                staff_id: true,
                first_name: true,
                username: true,
                email: true,
            }
        });
    }

    public async getStaffByPasswordResetToken(resetToken: string) {
        return await this.prisma.staff.findUnique({
            where: {
                password_reset_token: resetToken,
            },
            select: {
                staff_id: true,
                first_name: true,
                username: true,
                password_hash: true,
                password_reset_token: true,
                password_reset_token_expires_at: true,
            }
        });
    }

    public async setPasswordResetToken(staffId: number, resetToken: string, expiresAt: Date) {
        return await this.prisma.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                password_reset_token: resetToken,
                password_reset_token_expires_at: expiresAt,
            },
            select: {
                staff_id: true,
                first_name: true,
                username: true,
                email: true,
            }
        });
    }

    public async completePasswordReset(staffId: number, hashedPassword: string) {
        return await this.prisma.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                password_hash: hashedPassword,
                password_reset_token: null,
                password_reset_token_expires_at: null,
                failed_login_count: 0,
                failed_login_window_started_at: null,
                locked_until: null,
            },
            select: {
                staff_id: true,
                first_name: true,
                username: true,
            }
        });
    }

    public async findStaffByEmailExcluding(email: string, staffId: number) {
        return await this.prisma.staff.findFirst({
            where: {
                email,
                staff_id: { not: staffId },
                deleted_at: null,
            },
            select: { staff_id: true },
        });
    }

    public async findStaffByPendingEmailExcluding(email: string, staffId: number) {
        return await this.prisma.staff.findFirst({
            where: {
                pending_email: email,
                staff_id: { not: staffId },
                deleted_at: null,
            },
            select: { staff_id: true },
        });
    }

    public async setPendingEmail(staffId: number, newEmail: string, token: string, expiresAt: Date) {
        return await this.prisma.staff.update({
            where: { staff_id: staffId },
            data: {
                pending_email: newEmail,
                pending_email_token: token,
                pending_email_token_expires_at: expiresAt,
            },
        });
    }

    public async getStaffByPendingEmailToken(token: string) {
        return await this.prisma.staff.findUnique({
            where: { pending_email_token: token },
            select: {
                staff_id: true,
                email: true,
                pending_email: true,
                pending_email_token: true,
                pending_email_token_expires_at: true,
            },
        });
    }

    public async confirmPendingEmail(staffId: number, newEmail: string) {
        return await this.prisma.staff.update({
            where: { staff_id: staffId },
            data: {
                email: newEmail,
                pending_email: null,
                pending_email_token: null,
                pending_email_token_expires_at: null,
            },
            select: {
                staff_id: true,
                email: true,
            },
        });
    }

    public async recordFailedLoginAttempt(staffId: number, data: {
        failed_login_count: number;
        failed_login_window_started_at: Date;
        locked_until: Date | null;
    }) {
        return await this.prisma.staff.update({
            where: { staff_id: staffId },
            data,
        });
    }

    public async resetLoginAttempts(staffId: number) {
        return await this.prisma.staff.update({
            where: { staff_id: staffId },
            data: {
                failed_login_count: 0,
                failed_login_window_started_at: null,
                locked_until: null,
                last_login_at: new Date(),
            },
        });
    }

    public async findRoleIdByName(roleName: string): Promise<number | null> {
        const role = await this.prisma.roleMaster.findFirst({
            where: { role_name: { equals: roleName, mode: "insensitive" } },
        });
        return role?.role_id ?? null;
    }
}
