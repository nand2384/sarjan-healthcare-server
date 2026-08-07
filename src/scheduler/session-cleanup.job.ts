import { appContext } from "../app.context";
import { schedule } from "./schedule";

export function startSessionCleanupJob() {
    schedule("session-cleanup", "0 * * * *", async () => {
        await appContext.services.sessionService.cleanupExpiredSessions();
    });
}
