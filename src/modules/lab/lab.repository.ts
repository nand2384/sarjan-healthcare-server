import { PrismaClient } from "@generated/prisma/client";

export interface EnterTestResultData {
    status: "IN_PROGRESS" | "COMPLETED";
    result_value?: string;
    result_notes?: string;
}

export class LabRepository {
    constructor(private readonly prisma: PrismaClient) {}

    /** Every test order tied to an appointment this doctor is treating, or that
     * this doctor personally ordered (covers walk-in test-only orders a doctor
     * placed directly). */
    public async findForDoctor(doctorStaffId: number, onlyPending: boolean) {
        return this.prisma.testOrder.findMany({
            where: {
                OR: [
                    { appointment: { doctor_staff_id: doctorStaffId } },
                    { ordered_by_staff_id: doctorStaffId },
                ],
                ...(onlyPending ? { status: { not: "COMPLETED" } } : {}),
            },
            include: {
                patient: true,
                test_catalog: true,
                appointment: true,
            },
            orderBy: { ordered_at: "desc" },
        });
    }

    public async findById(id: number) {
        return this.prisma.testOrder.findUnique({
            where: { test_order_id: id },
            include: { appointment: true },
        });
    }

    public async enterResult(id: number, data: EnterTestResultData, staffId: number) {
        return this.prisma.testOrder.update({
            where: { test_order_id: id },
            data: {
                status: data.status,
                result_value: data.result_value,
                result_notes: data.result_notes,
                result_entered_by_staff_id: staffId,
                result_entered_at: new Date(),
            },
            include: { patient: true, test_catalog: true },
        });
    }
}
