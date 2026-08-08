import { appContext } from "../app.context";
import { schedule } from "./schedule";

export function startSessionCleanupJob() {
    schedule("session-cleanup", "0 * * * *", async () => {
        const deleted = await appContext.services.sessionService.cleanupExpiredSessions();
        return { deleted };
    });
}
