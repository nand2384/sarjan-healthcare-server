import { Worker, Job } from "bullmq";
import { queueConnection } from "./redis-connection";
import { REMINDER_QUEUE_NAME, AppointmentReminderJobData } from "./reminder.queue";
import { appContext } from "app.context";
import { logger } from "@logger";

let worker: Worker<AppointmentReminderJobData> | null = null;

export const REMINDER_JOB_NAME = "reminder-queue:reminder";

export function startReminderWorker(): void {
    if (worker) return;

    worker = new Worker<AppointmentReminderJobData>(
        REMINDER_QUEUE_NAME,
        async (job: Job<AppointmentReminderJobData>) => {
            await appContext.services.whatsAppService.sendAppointmentReminder(job.data);
        },
        { connection: queueConnection },
    );

    worker.on("failed", (job, error) => {
        logger.error({ err: error, appointmentId: job?.data.appointmentId }, "Appointment reminder job failed");

        appContext.services.eventLogService.recordStart(REMINDER_JOB_NAME).then((runId) =>
            appContext.services.eventLogService.recordFailure(runId, error.message),
        );
    });

    logger.info("Appointment reminder worker started");
}
