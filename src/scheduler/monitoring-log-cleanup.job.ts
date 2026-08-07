import { appContext } from "../app.context";
import { schedule } from "./schedule";

/** Retention windows — hardcoded constants for v1, mirrors notification-cleanup's day-count pattern. */
const ERROR_DELIVERY_RETENTION_DAYS = 30;
const JOB_RUN_RETENTION_DAYS = 90;

export function startMonitoringLogCleanupJob() {
    // 03:30 daily — off-peak, offset from the other cleanup jobs.
    schedule("monitoring-log-cleanup", "30 3 * * *", async () => {
        const [errorLogsDeleted, deliveryLogsDeleted, jobRunsDeleted] = await Promise.all([
            appContext.services.eventLogService.pruneOlderThan("ERROR", ERROR_DELIVERY_RETENTION_DAYS),
            appContext.services.eventLogService.pruneOlderThan("DELIVERY", ERROR_DELIVERY_RETENTION_DAYS),
            appContext.services.eventLogService.pruneOlderThan("JOB_RUN", JOB_RUN_RETENTION_DAYS),
        ]);

        appContext.logger.info(
            { errorLogsDeleted, deliveryLogsDeleted, jobRunsDeleted },
            "Monitoring log cleanup completed",
        );
    });
}
