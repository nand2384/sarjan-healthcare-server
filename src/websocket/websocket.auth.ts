import { parseCookie } from "cookie";
import { Socket } from "socket.io";

import { env } from "@config";
import { AppError, ErrorCode } from "@errors";
import { AppContext } from "app.context";

export async function authenticateSocket(
    socket: Socket,
    appContext: AppContext,
): Promise<void> {
    const cookies = parseCookie(socket.handshake.headers.cookie ?? "");

    const sessionId =
        cookies[env.SESSION_COOKIE_NAME];

    if (!sessionId) {
        throw new AppError(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required.",
        );
    }

    const session =
        await appContext.services.sessionService.getSession(
            sessionId,
        );

    if (!session) {
        throw new AppError(
            401,
            ErrorCode.UNAUTHORIZED,
            "Authentication required.",
        );
    }

    socket.session = session;
}