import { Queue } from "bullmq";
import { queueConnection } from "./redis-connection";

export const NO_SHOW_QUEUE_NAME = "appointment-no-show";

export interface AppointmentNoShowJobData {
    appointmentId: number;
}

export const noShowQueue = new Queue<AppointmentNoShowJobData>(NO_SHOW_QUEUE_NAME, {
    connection: queueConnection,
});

function noShowJobId(appointmentId: number): string {
    return `appointment-no-show:${appointmentId}`;
}

/**
 * Enqueues (or, if already pending, no-ops on) a delayed no-show check for an
 * appointment, firing at slot-end. Stable jobId mirrors reminder.queue.ts's
 * approach — safe to call from both the nightly sweep and the same-day
 * booking/reschedule hooks without risking a duplicate.
 */
export async function scheduleNoShowCheck(data: AppointmentNoShowJobData, delayMs: number): Promise<void> {
    await noShowQueue.add("no-show-check", data, {
        delay: Math.max(delayMs, 0),
        jobId: noShowJobId(data.appointmentId),
        removeOnComplete: true,
        removeOnFail: true,
    });
}

/** Cancels a pending no-show check — called whenever an appointment leaves BOOKED before its slot ends. No-ops if already fired/absent. */
export async function cancelNoShowCheck(appointmentId: number): Promise<void> {
    const job = await noShowQueue.getJob(noShowJobId(appointmentId));
    if (job) {
        await job.remove();
    }
}
