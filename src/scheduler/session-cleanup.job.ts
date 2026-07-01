import { appContext } from "../app.context";
import { schedule } from "./schedule";

export function startSessionCleanupJob() {
    schedule("0 * * * *", async () => {
        await appContext.services.sessionService.cleanupExpiredSessions();
    });
}
