import { appContext } from "../app.context";
import { schedule } from "./schedule";
import { formatSlotTime12Hour } from "../utils/appointment-time.util";

/**
 * Nightly sweep: groups tomorrow's BOOKED appointments by doctor and emails
 * each doctor their appointment count + first slot time. Runs alongside the
 * reminder sweep since both need the same "tomorrow's bookings" query.
 */
export function startDoctorShiftNoticeJob() {
    // 01:05 IST daily — just after the reminder sweep, same low-traffic window.
    schedule("doctor-shift-notice", "5 1 * * *", async () => {
        const tomorrowStart = new Date();
        tomorrowStart.setUTCHours(0, 0, 0, 0);
        tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

        const dayAfterStart = new Date(tomorrowStart);
        dayAfterStart.setUTCDate(dayAfterStart.getUTCDate() + 1);

        const appointments = (await appContext.services.receptionistService.getBookedAppointmentsForDate(
            tomorrowStart,
            dayAfterStart,
        )) as any[];

        const byDoctor = new Map<number, { email: string; firstName: string; count: number; firstSlot: Date }>();

        for (const appt of appointments) {
            if (!appt.doctor?.email || !appt.doctor_availability?.start_time) continue;

            const existing = byDoctor.get(appt.doctor_staff_id);
            if (existing) {
                existing.count++;
                if (appt.doctor_availability.start_time < existing.firstSlot) {
                    existing.firstSlot = appt.doctor_availability.start_time;
                }
            } else {
                byDoctor.set(appt.doctor_staff_id, {
                    email: appt.doctor.email,
                    firstName: appt.doctor.first_name,
                    count: 1,
                    firstSlot: appt.doctor_availability.start_time,
                });
            }
        }

        let sent = 0;

        for (const doctor of byDoctor.values()) {
            await appContext.services.mailerService
                .sendDoctorShiftNotice({
                    to: doctor.email,
                    firstName: doctor.firstName,
                    appointmentCount: doctor.count,
                    firstSlotTime: formatSlotTime12Hour(doctor.firstSlot),
                })
                .catch((error) => appContext.logger.error({ err: error, to: doctor.email }, "Failed to send doctor shift notice email"));
            sent++;
        }

        appContext.logger.info({ sent, doctors: byDoctor.size }, "Doctor shift notice sweep completed");

        return { emailsSent: sent, doctorsWithAppointments: byDoctor.size, totalAppointmentsTomorrow: appointments.length };
    });
}
