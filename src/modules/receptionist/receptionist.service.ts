import { AppError, ErrorCode } from "@errors";
import { ReceptionistRepository } from "./receptionist.repository";
import { ReceptionistMapper } from "./receptionist.mapper";

export class ReceptionistService {
    constructor(private readonly receptionistRepository: ReceptionistRepository) {}

    public async getDashboardData() {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const doctors = await this.receptionistRepository.getDoctorsInOpd(today, tomorrow);
        const upcomingAppointments = await this.receptionistRepository.getUpcomingAppointments(today, tomorrow);
        const stats = await this.receptionistRepository.getDailyStats(today, tomorrow);

        return ReceptionistMapper.toDashboardResponse(doctors, upcomingAppointments, stats);
    }

    public async getAllAppointments(startDateStr?: string, endDateStr?: string) {
        let startDate: Date;
        let endDate: Date;

        if (startDateStr && endDateStr) {
            // Append time to parse as local time (Server time) instead of UTC midnight
            startDate = new Date(`${startDateStr}T00:00:00`);
            endDate = new Date(`${endDateStr}T23:59:59.999`);
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

        const doctor = await this.receptionistRepository.getDoctorWithAppointments(doctorId, today, tomorrow);
        const upcomingAppointments = await this.receptionistRepository.getUpcomingAppointments(today, tomorrow, doctorId);

        return ReceptionistMapper.toDoctorDashboardResponse(doctor, upcomingAppointments);
    }

    public async checkInPatient(appointmentId: number, createdByStaffId: number) {
        return this.receptionistRepository.checkInPatientTx(appointmentId, createdByStaffId);
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

        return this.receptionistRepository.updateAppointmentStatusTx(appointmentId, targetStatusId, statusName, staffId);
    }

}
