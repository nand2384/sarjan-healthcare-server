import "express";

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            session: {
                session_id: string;
                staff_id: number;
                username: string;
                roles: string[];
                expires_at: string;
            };
            auditContext: {
                performed_by_staff_id: number;
                ip_address: string;
                user_agent: string;
            };
        }
    }
}
