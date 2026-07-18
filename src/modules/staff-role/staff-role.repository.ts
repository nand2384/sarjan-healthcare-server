import { Prisma, PrismaClient, StaffRole } from "@generated/prisma/client";
import { AssignedRole } from "./staff-role.types";

export class StaffRoleRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async assignRole(
        staffId: number,
        roleId: number,
        tx?: Prisma.TransactionClient,
    ): Promise<AssignedRole> {
        const db = tx ?? this.prisma;

        return db.staffRole.create({
            data: {
                staff_id: staffId,
                role_id: roleId,
            },
            select: {
                role: {
                    select: {
                        role_id: true,
                        role_name: true,
                    },
                },
            },
        });
    }

    public async removeRole(
        staffId: number,
        roleId: number,
        tx?: Prisma.TransactionClient,
    ): Promise<StaffRole> {
        const db = tx ?? this.prisma;

        return db.staffRole.delete({
            where: {
                staff_id_role_id: {
                    staff_id: staffId,
                    role_id: roleId,
                },
            },
        });
    }

    public async findRolesByStaffId(
        staffId: number, 
        tx?: Prisma.TransactionClient
    ) {
        const db = tx ?? this.prisma;

        return db.staffRole.findMany({
            where: {
                staff_id: staffId,
            },
            include: {
                role: true,
            },
        });
    }

    public async removeAllRolesForStaff(
        staffId: number,
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;

        return db.staffRole.deleteMany({
            where: {
                staff_id: staffId,
            },
        });
    }

    public async assignMultipleRoles(
        staffId: number,
        roleIds: number[],
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;

        if (roleIds.length === 0) return { count: 0 };

        return db.staffRole.createMany({
            data: roleIds.map(roleId => ({
                staff_id: staffId,
                role_id: roleId,
            })),
        });
    }
}
