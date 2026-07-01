import "express";

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            session: {
                staff_id: number;
                username: string;
                roles: string[];
                expires_at: string;
            };
        }
    }
}
