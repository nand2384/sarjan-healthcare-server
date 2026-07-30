import { FinanceRepository } from "./finance.repository";
import { DoctorFinanceBreakdownDto, DoctorPaymentItemDto, FinanceSummaryDto } from "./finance.dto";

export class FinanceService {
    constructor(private readonly financeRepository: FinanceRepository) {}

    public async getSummary(startDate: Date, endDate: Date): Promise<FinanceSummaryDto> {
        const [appointments, newRegistrations] = await Promise.all([
            this.financeRepository.getAppointmentsWithPaymentsInRange(startDate, endDate),
            this.financeRepository.getNewRegistrationsCount(startDate, endDate),
        ]);

        let totalRevenue = 0;
        let totalConsultationsBilled = 0;
        let totalWalkIns = 0;

        const doctorMap = new Map<number, DoctorFinanceBreakdownDto>();

        for (const appt of appointments) {
            if (appt.queue?.queue_type === 'WALK_IN') totalWalkIns++;

            if (!doctorMap.has(appt.doctor_staff_id)) {
                doctorMap.set(appt.doctor_staff_id, {
                    staff_id: appt.doctor_staff_id,
                    doctor_name: appt.doctor ? `Dr. ${appt.doctor.first_name} ${appt.doctor.last_name}` : 'Unknown',
                    consultation_revenue: 0,
                    test_revenue: 0,
                    total_revenue: 0,
                    advance_count: 0,
                    walk_in_count: 0,
                    new_patient_count: 0,
                    returning_patient_count: 0,
                    cash_amount: 0,
                    card_amount: 0,
                    upi_amount: 0,
                });
            }
            const doctorStats = doctorMap.get(appt.doctor_staff_id)!;

            if (appt.queue?.queue_type === 'WALK_IN') doctorStats.walk_in_count++;
            else if (appt.queue?.queue_type === 'BOOKED') doctorStats.advance_count++;

            if (appt.payment) {
                const amount = Number(appt.payment.total_amount);
                totalRevenue += amount;
                totalConsultationsBilled += 1;
                doctorStats.total_revenue += amount;

                for (const lineItem of appt.payment.line_items) {
                    if (lineItem.item_type === 'CONSULTATION') doctorStats.consultation_revenue += Number(lineItem.amount);
                    else doctorStats.test_revenue += Number(lineItem.amount);
                }

                if (appt.payment.consultation_fee_type === 'OLD') doctorStats.returning_patient_count++;
                else if (appt.payment.consultation_fee_type === 'NEW') doctorStats.new_patient_count++;

                if (appt.payment.payment_method === 'CASH') doctorStats.cash_amount += amount;
                else if (appt.payment.payment_method === 'CARD') doctorStats.card_amount += amount;
                else if (appt.payment.payment_method === 'UPI') doctorStats.upi_amount += amount;
            }
        }

        return {
            total_revenue: totalRevenue,
            total_consultations_billed: totalConsultationsBilled,
            total_walk_ins: totalWalkIns,
            new_registrations: newRegistrations,
            doctors: Array.from(doctorMap.values()),
        };
    }

    public async getDoctorPayments(doctorStaffId: number, startDate: Date, endDate: Date): Promise<DoctorPaymentItemDto[]> {
        const appointments = await this.financeRepository.getDoctorPayments(doctorStaffId, startDate, endDate);

        return appointments
            .filter((appt) => appt.payment !== null)
            .map((appt) => ({
                appointment_id: appt.appointment_id,
                date: appt.appointment_date.toISOString(),
                patient_name: `${appt.patient.first_name}${appt.patient.middle_name ? ' ' + appt.patient.middle_name : ''} ${appt.patient.last_name}`,
                receipt_no: appt.payment!.receipt_no,
                total_amount: Number(appt.payment!.total_amount),
                payment_method: appt.payment!.payment_method,
                patient_type: appt.payment!.consultation_fee_type as 'NEW' | 'OLD' | null,
            }));
    }
}
