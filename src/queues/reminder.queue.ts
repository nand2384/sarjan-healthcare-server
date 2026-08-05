import { Queue } from "bullmq";
import { queueConnection } from "./redis-connection";

export const REMINDER_QUEUE_NAME = "appointment-reminders";

export interface AppointmentReminderJobData {
    appointmentId: number;
    patientName: string;
    whatsappNumber: string;
    doctorName: string;
    slotTimeFormatted: string;
    clinicName: string;
}

export const reminderQueue = new Queue<AppointmentReminderJobData>(REMINDER_QUEUE_NAME, {
    connection: queueConnection,
});

function reminderJobId(appointmentId: number): string {
    return `appointment-reminder:${appointmentId}`;
}

/**
 * Enqueues (or, if already pending, no-ops on) a delayed reminder job for an
 * appointment. The stable jobId makes this idempotent — safe to call from both
 * the nightly sweep and the same-day booking hook without risking a duplicate
 * send if their coverage windows ever overlap.
 */
export async function scheduleReminder(data: AppointmentReminderJobData, delayMs: number): Promise<void> {
    await reminderQueue.add("reminder", data, {
        delay: Math.max(delayMs, 0),
        jobId: reminderJobId(data.appointmentId),
        removeOnComplete: true,
        removeOnFail: true,
    });
}

/** Cancels a pending reminder job — called when its appointment is cancelled. No-ops if already sent/absent. */
export async function cancelReminder(appointmentId: number): Promise<void> {
    const job = await reminderQueue.getJob(reminderJobId(appointmentId));
    if (job) {
        await job.remove();
    }
}
