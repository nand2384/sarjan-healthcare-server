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
                username: true,
                password_hash: true,
                is_disabled: true,
                is_account_activated: true,
                deleted_at: true,

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
}
