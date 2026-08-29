import { Prisma, PrismaClient } from "@generated/prisma/client";
import { CreateReferralDto } from "./referral.schema";

export class ReferralRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async hasDirectAppointment(doctorStaffId: number, patientId: number): Promise<boolean> {
        const appointment = await this.prisma.appointment.findFirst({
            where: { doctor_staff_id: doctorStaffId, patient_id: patientId },
            select: { appointment_id: true },
        });
        return !!appointment;
    }

    public async hasActiveReferralGrant(doctorStaffId: number, patientId: number): Promise<boolean> {
        const referral = await this.prisma.patientReferral.findFirst({
            where: { referred_to_staff_id: doctorStaffId, patient_id: patientId, is_active: true },
            select: { referral_id: true },
        });
        return !!referral;
    }

    public async create(
        data: CreateReferralDto & { referred_by_staff_id: number; consultation_id?: number | null },
        tx?: Prisma.TransactionClient,
    ) {
        const db = tx ?? this.prisma;
        return db.patientReferral.create({
            data: {
                patient_id: data.patient_id,
                referred_by_staff_id: data.referred_by_staff_id,
                referred_to_staff_id: data.referred_to_staff_id,
                consultation_id: data.consultation_id ?? null,
                note: data.note,
            },
            include: {
                referred_by_staff: { select: { staff_id: true, first_name: true, last_name: true } },
                referred_to_staff: { select: { staff_id: true, first_name: true, last_name: true } },
            },
        });
    }

    public async findById(referralId: number) {
        return this.prisma.patientReferral.findUnique({ where: { referral_id: referralId } });
    }

    public async findByPatient(patientId: number) {
        return this.prisma.patientReferral.findMany({
            where: { patient_id: patientId },
            orderBy: { created_at: "desc" },
            include: {
                referred_by_staff: { select: { staff_id: true, first_name: true, last_name: true } },
                referred_to_staff: { select: { staff_id: true, first_name: true, last_name: true } },
                revoked_by_staff: { select: { staff_id: true, first_name: true, last_name: true } },
            },
        });
    }

    public async revoke(referralId: number, revokedByStaffId: number) {
        return this.prisma.patientReferral.update({
            where: { referral_id: referralId },
            data: { is_active: false, revoked_by_staff_id: revokedByStaffId, revoked_at: new Date() },
        });
    }

    /** Every patient this doctor has direct-appointment access to, or an active referral grant for. */
    public async findAccessiblePatientIds(doctorStaffId: number): Promise<{ direct: number[]; referred: number[] }> {
        const [direct, referred] = await Promise.all([
            this.prisma.appointment.findMany({
                where: { doctor_staff_id: doctorStaffId },
                select: { patient_id: true },
                distinct: ["patient_id"],
            }),
            this.prisma.patientReferral.findMany({
                where: { referred_to_staff_id: doctorStaffId, is_active: true },
                select: { patient_id: true },
                distinct: ["patient_id"],
            }),
        ]);
        return {
            direct: direct.map((a) => a.patient_id),
            referred: referred.map((r) => r.patient_id),
        };
    }
}
