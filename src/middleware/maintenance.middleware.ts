import { Request, Response, NextFunction } from "express";
import { env } from "@config";
import { appContext } from "app.context";
import { SystemSettingBooleanKey } from "constants/system-setting.constants";
import { USER_ROLE } from "common/common.schema";
import { ErrorCode } from "@errors";

// Requests to these prefixes always pass through, regardless of maintenance
// mode — health checks (load balancer / uptime monitors), the entire auth
// surface (so people can still log in and see the banner via /auth/me), and
// the toggle endpoint itself (so a developer can always flip it back off).
const ALLOWED_PATH_PREFIXES = ["/api/health", "/api/auth", "/api/system-settings/maintenance-mode"];

/**
 * Cannot reuse authMiddleware here — it throws on a missing session, which is
 * wrong for unauthenticated requests to allow-listed paths, and it's normally
 * mounted per-router rather than globally. This resolves the session cookie
 * itself and treats "no session" / "session without an allowed role" the
 * same way: blocked, unless the path is allow-listed above.
 */
export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (ALLOWED_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
        return next();
    }

    const enabled = await appContext.services.systemSettingService.getBoolean(SystemSettingBooleanKey.MAINTENANCE_MODE_ENABLED);
    if (!enabled) {
        return next();
    }

    const sessionId = req.cookies[env.SESSION_COOKIE_NAME];
    const session = sessionId ? await appContext.services.sessionService.getSession(sessionId) : null;
    const hasBypassRole = session?.roles.some((role) => role === USER_ROLE.ADMIN || role === USER_ROLE.DEVELOPER) ?? false;

    if (hasBypassRole) {
        return next();
    }

    res.status(503).json({
        success: false,
        error: {
            code: ErrorCode.MAINTENANCE_MODE,
            message: "The site is temporarily down for maintenance. Please check back shortly.",
        },
    });
}
