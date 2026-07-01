import { PrismaClient } from "@generated/prisma/client";

export class AuthRepository {
    constructor(private readonly prisma: PrismaClient) {}

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
}
