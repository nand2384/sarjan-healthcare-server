/**
 * Number of BOOKED patients that must have started consultation ahead of a
 * waiting walk-in before that walk-in is "promoted" and becomes eligible to
 * be called in ahead of any remaining un-promoted BOOKED patients.
 */
export const WALK_IN_PRIORITY_THRESHOLD = 3;

const CHECKED_IN_STATUS_ID = 5;

interface QueueOrderableAppointment {
    appointment_status_id?: number | null;
    queue?: {
        queue_type?: string | null;
        skip_count?: number | null;
        joined_queue_at?: Date | string | null;
    } | null;
}

export function isPromotedWalkIn(appt: QueueOrderableAppointment): boolean {
    return appt.queue?.queue_type === 'WALK_IN' && (appt.queue?.skip_count ?? 0) >= WALK_IN_PRIORITY_THRESHOLD;
}

/**
 * Orders a doctor's appointments so that, among patients physically waiting
 * to be seen (CHECKED_IN): promoted walk-ins come first, then BOOKED
 * patients, then remaining un-promoted walk-ins — each group internally
 * ordered by how long they've been in the queue. Appointments outside the
 * "waiting" set (in-consultation, scheduled-not-arrived, completed, etc.)
 * keep their original relative order.
 */
export function sortAppointmentsByQueuePriority<T extends QueueOrderableAppointment>(appointments: T[]): T[] {
    const rank = (appt: T): number => {
        if (appt.appointment_status_id !== CHECKED_IN_STATUS_ID) return 1;
        if (isPromotedWalkIn(appt)) return -2;
        if (appt.queue?.queue_type === 'BOOKED') return -1;
        return 0;
    };

    const joinedAtMs = (appt: T): number => {
        const joinedAt = appt.queue?.joined_queue_at;
        return joinedAt ? new Date(joinedAt).getTime() : 0;
    };

    return [...appointments].sort((a, b) => {
        const rankDiff = rank(a) - rank(b);
        if (rankDiff !== 0) return rankDiff;
        return joinedAtMs(a) - joinedAtMs(b);
    });
}
