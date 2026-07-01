import { env } from "@config";
import { AppError, ErrorCode } from "@errors";
import { appContext } from "app.context";
import { Request, Response, NextFunction } from "express";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
    const sessionId = req.cookies[env.SESSION_COOKIE_NAME];

    if (!sessionId) {
        throw new AppError(401, ErrorCode.UNAUTHORIZED, "Authentication required.");
    }

    const session = await appContext.services.sessionService.getSession(sessionId);

    if (!session) {
        throw new AppError(401, ErrorCode.UNAUTHORIZED, "Authentication required.");
    }

    req.session = session;

    next();
}
