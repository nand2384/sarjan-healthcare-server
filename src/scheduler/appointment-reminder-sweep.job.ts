import { appContext } from "../app.context";
import { schedule } from "./schedule";
import { getAppointmentStartInstantUTC, formatSlotTime12Hour } from "../utils/appointment-time.util";
import { scheduleReminder } from "../queues/reminder.queue";
import { SystemSettingKey } from "../constants/system-setting.constants";
import { CLINIC_NAME } from "whatsapp";

/**
 * Nightly sweep: finds tomorrow's BOOKED (not walk-in) appointments and
 * enqueues one delayed BullMQ job per appointment, each firing at
 * (slot start − configured hours-before). Deliberately looks only one day
 * ahead — re-deriving reminders from current DB state nightly, rather than
 * scheduling far in advance, means a doctor's slot being edited or an
 * appointment being cancelled later the same day is naturally reflected
 * before a job is ever created (same-day bookings are covered separately by
 * the booking-time hook in patient.service.ts).
 */
export function startAppointmentReminderSweepJob() {
    // 01:00 IST daily — low traffic, well ahead of any reminder that could fire that morning.
    schedule("appointment-reminder-sweep", "0 1 * * *", async () => {
        const tomorrowStart = new Date();
        tomorrowStart.setUTCHours(0, 0, 0, 0);
        tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

        const dayAfterStart = new Date(tomorrowStart);
        dayAfterStart.setUTCDate(dayAfterStart.getUTCDate() + 1);

        const [appointments, hoursBefore] = await Promise.all([
            appContext.services.receptionistService.getBookedAppointmentsForDate(tomorrowStart, dayAfterStart),
            appContext.services.systemSettingService.getNumber(SystemSettingKey.APPOINTMENT_REMINDER_HOURS_BEFORE),
        ]);

        let scheduled = 0;
        let skipped = 0;

        for (const appt of appointments as any[]) {
            if (!appt.doctor_availability?.start_time || !appt.patient?.whatsapp_number) {
                skipped++;
                continue;
            }

            const startInstant = getAppointmentStartInstantUTC(appt.appointment_date, appt.doctor_availability.start_time);
            const reminderAt = new Date(startInstant.getTime() - hoursBefore * 60 * 60 * 1000);
            const delayMs = reminderAt.getTime() - Date.now();

            if (delayMs <= 0) {
                // Misconfigured large offset, or a slot earlier than the sweep expected — skip rather than fire late/immediately.
                appContext.logger.warn(
                    { appointmentId: appt.appointment_id, reminderAt: reminderAt.toISOString() },
                    "Skipping appointment reminder — computed reminder time already passed",
                );
                skipped++;
                continue;
            }

            await scheduleReminder(
                {
                    appointmentId: appt.appointment_id,
                    patientName: `${appt.patient.first_name} ${appt.patient.last_name}`,
                    whatsappNumber: appt.patient.whatsapp_number,
                    doctorName: `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}`,
                    slotTimeFormatted: formatSlotTime12Hour(appt.doctor_availability.start_time),
                    clinicName: CLINIC_NAME,
                },
                delayMs,
            );
            scheduled++;
        }

        appContext.logger.info({ scheduled, skipped, total: appointments.length }, "Appointment reminder sweep completed");
    });
}
