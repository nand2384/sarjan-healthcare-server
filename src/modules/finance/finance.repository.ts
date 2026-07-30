import { PrismaClient } from "@generated/prisma/client";

export class FinanceRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getAppointmentsWithPaymentsInRange(startDate: Date, endDate: Date) {
        return this.prisma.appointment.findMany({
            where: { appointment_date: { gte: startDate, lte: endDate } },
            select: {
                appointment_id: true,
                doctor_staff_id: true,
                doctor: { select: { first_name: true, last_name: true } },
                queue: { select: { queue_type: true } },
                payment: {
                    select: {
                        total_amount: true,
                        payment_method: true,
                        consultation_fee_type: true,
                        line_items: { select: { item_type: true, amount: true } },
                    }
                }
            }
        });
    }

    public async getNewRegistrationsCount(startDate: Date, endDate: Date) {
        return this.prisma.patient.count({
            where: { created_at: { gte: startDate, lte: endDate } }
        });
    }

    public async getDoctorPayments(doctorStaffId: number, startDate: Date, endDate: Date) {
        return this.prisma.appointment.findMany({
            where: {
                doctor_staff_id: doctorStaffId,
                appointment_date: { gte: startDate, lte: endDate },
                payment: { isNot: null },
            },
            select: {
                appointment_id: true,
                appointment_date: true,
                patient: { select: { first_name: true, middle_name: true, last_name: true } },
                payment: {
                    select: {
                        receipt_no: true,
                        total_amount: true,
                        payment_method: true,
                        consultation_fee_type: true,
                    }
                }
            },
            orderBy: { appointment_date: 'desc' }
        });
    }
}
