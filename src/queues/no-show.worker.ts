import { Worker, Job } from "bullmq";
import { queueConnection } from "./redis-connection";
import { NO_SHOW_QUEUE_NAME, AppointmentNoShowJobData } from "./no-show.queue";
import { appContext } from "app.context";
import { logger } from "@logger";

let worker: Worker<AppointmentNoShowJobData> | null = null;

export const NO_SHOW_JOB_NAME = "no-show-queue:no-show-check";

export function startNoShowWorker(): void {
    if (worker) return;

    worker = new Worker<AppointmentNoShowJobData>(
        NO_SHOW_QUEUE_NAME,
        async (job: Job<AppointmentNoShowJobData>) => {
            await appContext.services.receptionistService.markNoShowIfStillBooked(job.data.appointmentId);
        },
        {
            connection: queueConnection,
            // Idle-polling throttle — see reminder.worker.ts for the rationale.
            drainDelay: 300,
            stalledInterval: 300_000,
        },
    );

    worker.on("failed", (job, error) => {
        logger.error({ err: error, appointmentId: job?.data.appointmentId }, "No-show check job failed");

        appContext.services.eventLogService.recordStart(NO_SHOW_JOB_NAME).then((runId) =>
            appContext.services.eventLogService.recordFailure(runId, error.message),
        );
    });

    logger.info("Appointment no-show worker started");
}
