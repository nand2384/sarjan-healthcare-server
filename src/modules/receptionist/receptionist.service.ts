import { AppError, ErrorCode } from "@errors";
import { ReceptionistRepository, AppointmentHistoryFilters } from "./receptionist.repository";
import { ReceptionistMapper } from "./receptionist.mapper";
import { BillingRepository } from "@modules/billing/billing.repository";
import { BillingService } from "@modules/billing/billing.service";
import { CheckoutPaymentMethod } from "@modules/billing/billing.dto";
import { WebSocketPublisher } from "websocket";
import { SystemSettingService } from "@modules/system-setting/system-setting.service";
import { SystemSettingKey } from "constants/system-setting.constants";
import { WhatsAppService, CLINIC_NAME } from "whatsapp";
import { getAppointmentStartInstantUTC, getAppointmentEndInstantUTC, formatSlotTime12Hour } from "utils/appointment-time.util";
import { scheduleReminder } from "queues/reminder.queue";
import { scheduleNoShowCheck } from "queues/no-show.queue";
import { logger } from "@logger";

type AuditContext = { performed_by_staff_id: number; ip_address?: string; user_agent?: string };

export class ReceptionistService {
    constructor(
        private readonly receptionistRepository: ReceptionistRepository,
        private readonly billingRepository: BillingRepository,
        private readonly billingService: BillingService,
        private readonly systemSettingService: SystemSettingService,
        private readonly whatsAppService: WhatsAppService,
    ) {}

    public async getDashboardData() {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [doctors, upcomingAppointments, stats, walkInPriorityThreshold, checkInWindowHours] = await Promise.all([
            this.receptionistRepository.getDoctorsInOpd(today, tomorrow),
            this.receptionistRepository.getUpcomingAppointments(today, tomorrow),
            this.receptionistRepository.getDailyStats(today, tomorrow),
            this.systemSettingService.getNumber(SystemSettingKey.WALK_IN_PRIORITY_THRESHOLD),
            this.systemSettingService.getNumber(SystemSettingKey.CHECK_IN_WINDOW_HOURS_BEFORE),
        ]);

        return ReceptionistMapper.toDashboardResponse(doctors, upcomingAppointments, stats, walkInPriorityThreshold, checkInWindowHours);
    }

    public async getAllAppointments(startDateStr?: string, endDateStr?: string) {
        let startDate: Date;
        let endDate: Date;

        if (startDateStr && endDateStr) {
            // Parsed as UTC: appointment_date is a @db.Date column, which Prisma
            // materializes at UTC midnight. Parsing in server-local time would shift
            // the window and pull in the adjacent calendar day.
            startDate = new Date(`${startDateStr}T00:00:00.000Z`);
            endDate = new Date(`${endDateStr}T23:59:59.999Z`);
        } else {
            const now = new Date();
            // Default to start of current month to end of next month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1); 
            endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
            endDate.setUTCHours(23, 59, 59, 999);
        }

        const [appointments, checkInWindowHours] = await Promise.all([
            this.receptionistRepository.getAllAppointments(startDate, endDate),
            this.systemSettingService.getNumber(SystemSettingKey.CHECK_IN_WINDOW_HOURS_BEFORE),
        ]);
        return appointments.map((appt: any) => ReceptionistMapper.toAppointmentDto(appt, undefined, checkInWindowHours));
    }

    public async getDoctorDashboardData(doctorId: number) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [doctor, upcomingAppointments, walkInPriorityThreshold, checkInWindowHours] = await Promise.all([
            this.receptionistRepository.getDoctorWithAppointments(doctorId, today, tomorrow),
            this.receptionistRepository.getUpcomingAppointments(today, tomorrow, doctorId),
            this.systemSettingService.getNumber(SystemSettingKey.WALK_IN_PRIORITY_THRESHOLD),
            this.systemSettingService.getNumber(SystemSettingKey.CHECK_IN_WINDOW_HOURS_BEFORE),
        ]);

        return ReceptionistMapper.toDoctorDashboardResponse(doctor, upcomingAppointments, walkInPriorityThreshold, checkInWindowHours);
    }

    public async checkInPatient(appointmentId: number, createdByStaffId: number) {
        const checkInWindowHours = await this.systemSettingService.getNumber(SystemSettingKey.CHECK_IN_WINDOW_HOURS_BEFORE);
        const result = await this.receptionistRepository.checkInPatientTx(appointmentId, createdByStaffId, checkInWindowHours);

        WebSocketPublisher.queueUpdated({ appointmentId }, createdByStaffId, result.appointment.doctor_staff_id);

        return result;
    }

    public async updateAppointmentStatus(appointmentId: number, statusName: string, staffId: number) {
        const statusMap: Record<string, number> = {
            'waiting': 5,            // CHECKED_IN
            'in-consultation': 12,   // IN_CONSULTATION
            'waiting-reports': 13,   // WAITING_REPORTS
            'awaiting-payment': 14,  // AWAITING_PAYMENT
            'completed': 6,          // COMPLETED
            'walked-out': 15,        // WALKED_OUT
            'cancelled': 7           // CANCELLED
        };

        const targetStatusId = statusMap[statusName];
        if (!targetStatusId) throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid status");

        const result = await this.receptionistRepository.updateAppointmentStatusTx(appointmentId, targetStatusId, statusName, staffId);

        WebSocketPublisher.queueUpdated({ appointmentId }, staffId, result.doctor_staff_id);

        return result;
    }

    public async markNoShowIfStillBooked(appointmentId: number) {
        const result = await this.receptionistRepository.markNoShowIfStillBookedTx(appointmentId);
        if (result) {
            WebSocketPublisher.queueUpdated({ appointmentId }, result.created_by_staff_id, result.doctor_staff_id);
        }
        return result;
    }

    public async rescheduleAppointment(
        appointmentId: number,
        newDoctorAvailabilityId: number,
        newAppointmentDateStr: string,
        staffId: number,
    ) {
        const newAppointmentDate = new Date(`${newAppointmentDateStr}T00:00:00.000Z`);

        const updated = await this.receptionistRepository.rescheduleAppointmentTx(
            appointmentId,
            newDoctorAvailabilityId,
            newAppointmentDate,
            staffId,
        );

        WebSocketPublisher.queueUpdated({ appointmentId }, staffId, updated.doctor_staff_id);

        void this.scheduleJobsAndNotifyForReschedule(updated);

        return updated;
    }

    /** Never throws — a scheduling/notification hiccup must not fail the reschedule itself. */
    private async scheduleJobsAndNotifyForReschedule(appointment: any): Promise<void> {
        try {
            if (!appointment.doctor_availability?.start_time || !appointment.doctor_availability?.end_time) {
                return;
            }

            const todayMidnightUTC = new Date();
            todayMidnightUTC.setUTCHours(0, 0, 0, 0);
            const dayAfterTomorrowMidnightUTC = new Date(todayMidnightUTC);
            dayAfterTomorrowMidnightUTC.setUTCDate(dayAfterTomorrowMidnightUTC.getUTCDate() + 2);

            // Same today/tomorrow-only coverage window as new bookings — anything
            // further out is left to the nightly sweeps.
            if (appointment.appointment_date >= todayMidnightUTC && appointment.appointment_date < dayAfterTomorrowMidnightUTC) {
                const endInstant = getAppointmentEndInstantUTC(appointment.appointment_date, appointment.doctor_availability.end_time);
                const noShowDelayMs = endInstant.getTime() - Date.now();
                if (noShowDelayMs > 0) {
                    await scheduleNoShowCheck({ appointmentId: appointment.appointment_id }, noShowDelayMs);
                }

                if (appointment.patient?.whatsapp_number && appointment.doctor) {
                    const hoursBefore = await this.systemSettingService.getNumber(SystemSettingKey.APPOINTMENT_REMINDER_HOURS_BEFORE);
                    const startInstant = getAppointmentStartInstantUTC(appointment.appointment_date, appointment.doctor_availability.start_time);
                    const reminderDelayMs = startInstant.getTime() - hoursBefore * 60 * 60 * 1000 - Date.now();
                    if (reminderDelayMs > 0) {
                        await scheduleReminder(
                            {
                                appointmentId: appointment.appointment_id,
                                patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
                                whatsappNumber: appointment.patient.whatsapp_number,
                                doctorName: `Dr. ${appointment.doctor.first_name} ${appointment.doctor.last_name}`,
                                slotTimeFormatted: formatSlotTime12Hour(appointment.doctor_availability.start_time),
                                clinicName: CLINIC_NAME,
                            },
                            reminderDelayMs,
                        );
                    }
                }
            }

            if (appointment.patient?.whatsapp_number && appointment.doctor) {
                await this.whatsAppService.sendAppointmentRescheduled({
                    appointmentId: appointment.appointment_id,
                    patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
                    whatsappNumber: appointment.patient.whatsapp_number,
                    doctorName: `Dr. ${appointment.doctor.first_name} ${appointment.doctor.last_name}`,
                    newDateFormatted: appointment.appointment_date.toISOString().slice(0, 10),
                    newSlotTimeFormatted: formatSlotTime12Hour(appointment.doctor_availability.start_time),
                    clinicName: CLINIC_NAME,
                });
            }
        } catch (error) {
            logger.error({ err: error, appointmentId: appointment.appointment_id }, "Failed to schedule jobs / send confirmation after reschedule");
        }
    }

    public async sendForTests(appointmentId: number, testCatalogIds: number[], staffId: number) {
        const result = await this.billingRepository.sendForTestsTx(appointmentId, testCatalogIds, staffId);

        WebSocketPublisher.queueUpdated({ appointmentId }, staffId, result.appointment.doctor_staff_id);

        return result;
    }

    public async getCheckoutInfo(appointmentId: number) {
        return this.billingService.getCheckoutInfo(appointmentId);
    }

    public async checkout(
        appointmentId: number,
        staffId: number,
        additionalTestCatalogIds: number[],
        paymentMethod: CheckoutPaymentMethod,
        auditContext: AuditContext,
    ) {
        const result = await this.billingService.checkout(appointmentId, staffId, additionalTestCatalogIds, paymentMethod, auditContext);

        // Checkout removes the patient from the active queue — everyone else's board must reflect that.
        const appointment = await this.billingRepository.getAppointmentForCheckout(appointmentId);
        if (appointment) {
            WebSocketPublisher.queueUpdated({ appointmentId }, staffId, appointment.doctor_staff_id);
        }

        return result;
    }

    /** Thin passthrough used by the appointment-reminder sweep job (no mapping/pagination needed there). */
    public async getBookedAppointmentsForDate(start: Date, end: Date) {
        return this.receptionistRepository.getUpcomingAppointments(start, end);
    }

    public async getAppointmentHistory(filters: AppointmentHistoryFilters) {
        const { rows, total } = await this.receptionistRepository.getAppointmentHistory(filters);
        return {
            rows: rows.map((row: any) => ReceptionistMapper.toAppointmentHistoryItemDto(row)),
            total,
            page: filters.page,
            limit: filters.limit,
        };
    }

    public async getAppointmentHistorySummary(startDate: Date, endDate: Date) {
        return this.receptionistRepository.getAppointmentHistorySummary(startDate, endDate);
    }

    public async getReceipt(appointmentId: number) {
        return this.billingService.getReceipt(appointmentId);
    }

}
