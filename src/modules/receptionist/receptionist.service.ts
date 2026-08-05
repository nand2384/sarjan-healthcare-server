import { AppError, ErrorCode } from "@errors";
import { ReceptionistRepository, AppointmentHistoryFilters } from "./receptionist.repository";
import { ReceptionistMapper } from "./receptionist.mapper";
import { BillingRepository } from "@modules/billing/billing.repository";
import { BillingService } from "@modules/billing/billing.service";
import { CheckoutPaymentMethod } from "@modules/billing/billing.dto";
import { WebSocketPublisher } from "websocket";
import { SystemSettingService } from "@modules/system-setting/system-setting.service";
import { SystemSettingKey } from "constants/system-setting.constants";

type AuditContext = { performed_by_staff_id: number; ip_address?: string; user_agent?: string };

export class ReceptionistService {
    constructor(
        private readonly receptionistRepository: ReceptionistRepository,
        private readonly billingRepository: BillingRepository,
        private readonly billingService: BillingService,
        private readonly systemSettingService: SystemSettingService,
    ) {}

    public async getDashboardData() {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [doctors, upcomingAppointments, stats, walkInPriorityThreshold] = await Promise.all([
            this.receptionistRepository.getDoctorsInOpd(today, tomorrow),
            this.receptionistRepository.getUpcomingAppointments(today, tomorrow),
            this.receptionistRepository.getDailyStats(today, tomorrow),
            this.systemSettingService.getNumber(SystemSettingKey.WALK_IN_PRIORITY_THRESHOLD),
        ]);

        return ReceptionistMapper.toDashboardResponse(doctors, upcomingAppointments, stats, walkInPriorityThreshold);
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

        const appointments = await this.receptionistRepository.getAllAppointments(startDate, endDate);
        return appointments.map((appt: any) => ReceptionistMapper.toAppointmentDto(appt));
    }

    public async getDoctorDashboardData(doctorId: number) {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [doctor, upcomingAppointments, walkInPriorityThreshold] = await Promise.all([
            this.receptionistRepository.getDoctorWithAppointments(doctorId, today, tomorrow),
            this.receptionistRepository.getUpcomingAppointments(today, tomorrow, doctorId),
            this.systemSettingService.getNumber(SystemSettingKey.WALK_IN_PRIORITY_THRESHOLD),
        ]);

        return ReceptionistMapper.toDoctorDashboardResponse(doctor, upcomingAppointments, walkInPriorityThreshold);
    }

    public async checkInPatient(appointmentId: number, createdByStaffId: number) {
        const result = await this.receptionistRepository.checkInPatientTx(appointmentId, createdByStaffId);

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
