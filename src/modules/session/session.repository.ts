import { PrismaClient } from "../../generated/prisma/client";

export class SessionRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async createSession(
        staffId: number,
        ipAddress: string | null,
        userAgent: string | null,
        expiresAt: Date,
    ) {
        return await this.prisma.session.create({
            data: {
                staff_id: staffId,
                ip_address: ipAddress,
                user_agent: userAgent,
                expires_at: expiresAt,
            },
        });
    }

    public async findSessionById(sessionId: string) {
        return await this.prisma.session.findUnique({
            where: {
                session_id: sessionId,
            },
            include: {
                staff: {
                    include: {
                        staff_roles: {
                            include: {
                                role: true,
                            },
                        },
                    },
                },
            },
        });
    }

    // deleteMany (not delete) — must be idempotent. Redis is the actual source
    // of truth for "is this session live"; its Postgres row can already be
    // gone (e.g. pruned by the expired-session cleanup job on a different
    // TTL) while the session is still valid, and callers like
    // forceRevokeSession must not fail just because that row is missing.
    public async deleteSession(sessionId: string) {
        return await this.prisma.session.deleteMany({
            where: {
                session_id: sessionId,
            },
        });
    }

    public async deleteExpiredSessions() {
        return await this.prisma.session.deleteMany({
            where: {
                expires_at: {
                    lt: new Date(),
                },
            },
        });
    }

    public async findActiveSessionsByStaffId(staffId: number) {
        return await this.prisma.session.findMany({
            where: {
                staff_id: staffId,
                expires_at: { gt: new Date() }
            },
            select: {
                session_id: true,
                ip_address: true,
                user_agent: true,
                expires_at: true,
            },
            orderBy: {
                expires_at: 'desc'
            }
        });
    }

    public async findOtherSessionsByStaffId(staffId: number, currentSessionId: string) {
        return await this.prisma.session.findMany({
            where: {
                staff_id: staffId,
                session_id: {
                    not: currentSessionId
                }
            },
            select: {
                session_id: true
            }
        });
    }

    public async deleteOtherSessions(staffId: number, currentSessionId: string) {
        return await this.prisma.session.deleteMany({
            where: {
                staff_id: staffId,
                session_id: {
                    not: currentSessionId
                }
            }
        });
    }

    public async findSessionsByStaffId(staffId: number) {
        return await this.prisma.session.findMany({
            where: {
                staff_id: staffId
            },
            select: {
                session_id: true
            }
        });
    }

    public async deleteAllSessionsForStaff(staffId: number) {
        return await this.prisma.session.deleteMany({
            where: {
                staff_id: staffId
            }
        });
    }
}
