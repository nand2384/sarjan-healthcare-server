import { Prisma, PrismaClient, Staff } from "@generated/prisma/client";
import { StaffDetailEntity, StaffListEntity } from "./staff.types";

import { USER_ROLE_ID } from "../../common/common.schema";

export class StaffRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getAll(
        page?: number,
        limit?: number,
        tx?: Prisma.TransactionClient,
    ): Promise<{ data: StaffListEntity[], total: number }> {
        const prisma = tx ?? this.prisma;

        const whereCondition = {
            deleted_at: null,
            is_system_account: false,
            staff_roles: {
                none: {
                    role_id: USER_ROLE_ID.DOCTOR
                }
            }
        };

        const total = await prisma.staff.count({
            where: whereCondition
        });

        const data = await prisma.staff.findMany({
            where: whereCondition,
            orderBy: {
                created_at: "desc",
            },
            ...(page && limit ? {
                skip: (page - 1) * limit,
                take: limit,
            } : {}),
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile_number: true,
                is_disabled: true,
                is_account_activated: true,
                last_login_at: true,
                created_at: true,
                gender: {
                    select: {
                        value_id: true,
                        value_name: true,
                    },
                },
                staff_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                            },
                        },
                    },
                },
            },
        });

        return { data, total };
    }

    public async findById(
        staffId: number,
        tx?: Prisma.TransactionClient,
    ): Promise<StaffDetailEntity | null> {
        const db = tx ?? this.prisma;

        return db.staff.findUnique({
            where: {
                staff_id: staffId,
                deleted_at: null,
                is_system_account: false,
            },
            select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                username: true,
                mobile_number: true,
                email: true,
                gender: {
                    select: {
                        value_id: true,
                        value_name: true,
                    },
                },
                age: true,
                street_address: true,
                city: true,
                state: true,
                pincode: true,
                staff_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                            },
                        },
                    },
                },
                is_disabled: true,
                is_account_activated: true,
                last_login_at: true,
                created_at: true,
            },
        });
    }

    public async findExistingStaff(
        username: string,
        email: string,
        mobileNumber: string,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;

        return db.staff.findFirst({
            where: {
                OR: [{ username }, { email }, { mobile_number: mobileNumber }],
            },
            select: {
                staff_id: true,
                username: true,
                email: true,
                mobile_number: true,
            },
        });
    }

    public async create(
        data: Prisma.StaffCreateInput,
        tx?: Prisma.TransactionClient,
    ): Promise<Staff> {
        const db = tx ?? this.prisma;

        return db.staff.create({
            data,
        });
    }

    public async update(
        staffId: number,
        data: Prisma.StaffUpdateInput,
        tx?: Prisma.TransactionClient,
    ): Promise<Staff> {
        const db = tx ?? this.prisma;

        return db.staff.update({
            where: {
                staff_id: staffId,
            },
            data,
        });
    }

    public async disable(staffId: number, tx?: Prisma.TransactionClient): Promise<StaffListEntity> {
        const db = tx ?? this.prisma;

        return db.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                is_disabled: true,
            },
            select: {
                staff_id: true,

                first_name: true,
                last_name: true,

                email: true,
                mobile_number: true,

                is_disabled: true,
                is_account_activated: true,

                last_login_at: true,
                created_at: true,

                gender: {
                    select: {
                        value_id: true,
                        value_name: true,
                    },
                },

                staff_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                            },
                        },
                    },
                },
            },
        });
    }

    public async restore(staffId: number, tx?: Prisma.TransactionClient): Promise<StaffListEntity> {
        const db = tx ?? this.prisma;

        return db.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                is_disabled: false,
            },
            select: {
                staff_id: true,

                first_name: true,
                last_name: true,

                email: true,
                mobile_number: true,

                is_disabled: true,
                is_account_activated: true,

                last_login_at: true,
                created_at: true,

                gender: {
                    select: {
                        value_id: true,
                        value_name: true,
                    },
                },

                staff_roles: {
                    select: {
                        role: {
                            select: {
                                role_id: true,
                                role_name: true,
                            },
                        },
                    },
                },
            },
        });
    }

    public async delete(staffId: number, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;

        return db.staff.update({
            where: {
                staff_id: staffId,
            },
            data: {
                deleted_at: new Date(),
            },
            select: {
                deleted_at: true,
            },
        });
    }

    public async getActiveAdminIds(excludingStaffId?: number, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;

        const admins = await db.staff.findMany({
            where: {
                deleted_at: null,
                is_disabled: false,
                staff_roles: { some: { role_id: USER_ROLE_ID.ADMIN } },
                ...(excludingStaffId ? { staff_id: { not: excludingStaffId } } : {}),
            },
            select: { staff_id: true },
        });

        return admins.map((admin) => admin.staff_id);
    }

    public async getActiveStaffIdsByRole(roleId: number, excludingStaffId?: number, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;

        return db.staff.findMany({
            where: {
                deleted_at: null,
                is_disabled: false,
                staff_roles: { some: { role_id: roleId } },
                ...(excludingStaffId ? { staff_id: { not: excludingStaffId } } : {}),
            },
            select: { staff_id: true, email: true, first_name: true },
        });
    }

    public async getAllActiveStaffIds(excludingStaffId?: number, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;

        return db.staff.findMany({
            where: {
                deleted_at: null,
                is_disabled: false,
                ...(excludingStaffId ? { staff_id: { not: excludingStaffId } } : {}),
            },
            select: { staff_id: true, email: true, first_name: true },
        });
    }
}
