import { RedisClientType } from "redis";

import { env } from "@config";

import { SessionRepository } from "./session.repository";
import { StaffWithRoles } from "./session.types";

export class SessionService {
    constructor(
        private readonly sessionRepository: SessionRepository,
        private readonly redisClient: RedisClientType,
    ) {}

    public async createSession(
        staff: StaffWithRoles,
        ipAddress: string | null,
        userAgent: string | null,
    ) {
        const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);

        const session = await this.sessionRepository.createSession(
            staff.staff_id,
            ipAddress,
            userAgent,
            expiresAt,
        );

        await this.redisClient.set(
            `session:${session.session_id}`,
            JSON.stringify({
                staff_id: Number(staff.staff_id),
                username: staff.username,
                roles: staff.staff_roles.map((staffRole) => staffRole.role.role_name),
                expires_at: expiresAt.toISOString(),
            }),
            {
                expiration: {
                    type: "EX",
                    value: env.SESSION_TTL_SECONDS,
                },
            },
        );

        return session;
    }

    public async getSession(sessionId: string) {
        const redisKey = `session:${sessionId}`;

        const cached = await this.redisClient.get(redisKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const session = await this.sessionRepository.findSessionById(sessionId);

        if (!session) {
            return null;
        }

        if (session.expires_at <= new Date()) {
            await this.sessionRepository.deleteSession(session.session_id);

            return null;
        }

        await this.redisClient.set(
            redisKey,
            JSON.stringify({
                staff_id: Number(session.staff_id),
                username: session.staff.username,
                roles: session.staff.staff_roles.map((staffRole) => staffRole.role.role_name),
                expires_at: session.expires_at.toISOString(),
            }),
            {
                expiration: {
                    type: "EX",
                    value: Math.floor((session.expires_at.getTime() - Date.now()) / 1000),
                },
            },
        );

        return JSON.parse((await this.redisClient.get(redisKey)) as string);
    }

    public async deleteSession(sessionId: string) {
        await this.redisClient.del(`session:${sessionId}`);

        await this.sessionRepository.deleteSession(sessionId);
    }

    public async cleanupExpiredSessions() {
        await this.sessionRepository.deleteExpiredSessions();
    }
}
