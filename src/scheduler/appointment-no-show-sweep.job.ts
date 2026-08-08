import { appContext } from "../app.context";
import { schedule } from "./schedule";
import { getAppointmentEndInstantUTC } from "../utils/appointment-time.util";
import { scheduleNoShowCheck } from "../queues/no-show.queue";

/**
 * Nightly sweep: finds tomorrow's BOOKED (not walk-in) appointments and
 * enqueues one delayed BullMQ job per appointment, each firing at slot-end.
 * Mirrors appointment-reminder-sweep.job.ts exactly — same one-day-ahead
 * rationale (a cancellation/reschedule later the same day is naturally
 * reflected before a job is ever created), with same-day bookings covered
 * separately by the booking-time hook in patient.service.ts.
 */
export function startAppointmentNoShowSweepJob() {
    // 01:05 IST daily — right after the reminder sweep, same low-traffic window.
    schedule("appointment-no-show-sweep", "5 1 * * *", async () => {
        const tomorrowStart = new Date();
        tomorrowStart.setUTCHours(0, 0, 0, 0);
        tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

        const dayAfterStart = new Date(tomorrowStart);
        dayAfterStart.setUTCDate(dayAfterStart.getUTCDate() + 1);

        const appointments = await appContext.services.receptionistService.getBookedAppointmentsForDate(tomorrowStart, dayAfterStart);

        let scheduled = 0;
        let skipped = 0;

        for (const appt of appointments as any[]) {
            if (!appt.doctor_availability?.end_time) {
                skipped++;
                continue;
            }

            const endInstant = getAppointmentEndInstantUTC(appt.appointment_date, appt.doctor_availability.end_time);
            const delayMs = endInstant.getTime() - Date.now();

            if (delayMs <= 0) {
                appContext.logger.warn(
                    { appointmentId: appt.appointment_id, endInstant: endInstant.toISOString() },
                    "Skipping no-show check — computed slot-end already passed",
                );
                skipped++;
                continue;
            }

            await scheduleNoShowCheck({ appointmentId: appt.appointment_id }, delayMs);
            scheduled++;
        }

        appContext.logger.info({ scheduled, skipped, total: appointments.length }, "Appointment no-show sweep completed");

        return { scheduled, skipped, total: appointments.length };
    });
}
