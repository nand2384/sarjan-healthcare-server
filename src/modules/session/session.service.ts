import { RedisClientType } from "redis";

import { env } from "@config";

import { SessionRepository } from "./session.repository";
import { RedisSessionData, StaffWithRoles } from "./session.types";
import { AppError, ErrorCode } from "@errors";
import { UAParser } from "ua-parser-js";
import { logger } from "@logger";

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

        const redisSessionData: RedisSessionData = {
            session_id: session.session_id,
            staff_id: Number(staff.staff_id),
            username: staff.username,
            roles: staff.staff_roles.map((staffRole) => staffRole.role.role_name.toLowerCase()),
            expires_at: expiresAt.toISOString(),
        };

        await this.redisClient.set(
            `session:${session.session_id}`,
            JSON.stringify(redisSessionData),
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

        try {
            const cached = await this.redisClient.get(redisKey);

            if (cached) {
                const parsed = JSON.parse(cached) as RedisSessionData;
                parsed.roles = parsed.roles.map(r => r.toLowerCase());
                parsed.session_id = sessionId;
                return parsed;
            }
        } catch (error) {
            logger.warn(
                { sessionId, error },
                "Failed to fetch session from Redis.",
            );
        }

        const session = await this.sessionRepository.findSessionById(sessionId);

        if (!session) {
            return null;
        }

        if (session.expires_at <= new Date()) {
            await this.sessionRepository.deleteSession(session.session_id);

            return null;
        }

        const sessionData: RedisSessionData = {
            session_id: session.session_id,
            staff_id: Number(session.staff_id),
            username: session.staff.username,
            roles: session.staff.staff_roles.map((staffRole) => staffRole.role.role_name.toLowerCase()),
            expires_at: session.expires_at.toISOString(),
        };

        try {
            await this.redisClient.set(redisKey, JSON.stringify(sessionData), {
                expiration: {
                    type: "EX",
                    value: Math.floor((session.expires_at.getTime() - Date.now()) / 1000),
                },
            });
        } catch (error) {
            logger.warn(
                {
                    sessionId,
                    error,
                },
                "Failed to cache session in Redis.",
            );
        }

        return sessionData;
    }

    public async deleteSession(sessionId: string) {
        await this.redisClient.del(`session:${sessionId}`);

        await this.sessionRepository.deleteSession(sessionId);
    }

    public async cleanupExpiredSessions() {
        await this.sessionRepository.deleteExpiredSessions();
    }

    public async getActiveSessions(staffId: number, currentSessionId: string) {
        const sessions = await this.sessionRepository.findActiveSessionsByStaffId(staffId);
        
        return sessions.map(session => {
            const parser = new UAParser(session.user_agent || '');
            const os = parser.getOS().name || 'Unknown OS';
            const browser = parser.getBrowser().name || 'Unknown Browser';
            
            return {
                session_id: session.session_id,
                ip_address: session.ip_address,
                device: `${os} - ${browser}`,
                is_current_session: session.session_id === currentSessionId,
                last_active: session.expires_at.toISOString(),
            };
        });
    }

    public async revokeAllOtherSessions(staffId: number, currentSessionId: string) {
        // 1. Fetch other session IDs from Postgres
        const otherSessions = await this.sessionRepository.findOtherSessionsByStaffId(staffId, currentSessionId);
        
        // 2. Delete from Redis
        for (const session of otherSessions) {
            await this.redisClient.del(`session:${session.session_id}`);
        }
        
        // 3. Delete from Postgres
        await this.sessionRepository.deleteOtherSessions(staffId, currentSessionId);
    }
}
