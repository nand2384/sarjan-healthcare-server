import cron from "node-cron";
import { appContext } from "../app.context";

export function schedule(jobName: string, expression: string, task: () => Promise<Record<string, unknown> | void> | Record<string, unknown> | void) {
    return cron.schedule(
        expression,
        async () => {
            const { eventLogService } = appContext.services;
            const runId = await eventLogService.recordStart(jobName);

            try {
                const details = await task();
                await eventLogService.recordSuccess(runId, details ?? undefined);
            } catch (error) {
                appContext.logger.error({ err: error, jobName }, "Scheduled job failed");
                await eventLogService.recordFailure(runId, error instanceof Error ? error.message : String(error));
            }
        },
        {
            timezone: "Asia/Kolkata",
        },
    );
}
