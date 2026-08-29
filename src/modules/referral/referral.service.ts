import { AppError, ErrorCode } from "@errors";
import { ReferralRepository } from "./referral.repository";
import { CreateReferralDto } from "./referral.schema";

export class ReferralService {
    constructor(private readonly referralRepository: ReferralRepository) {}

    /** Shared access-check: can this doctor currently see this patient's records? */
    public async hasPatientAccess(doctorStaffId: number, patientId: number): Promise<boolean> {
        const hasDirect = await this.referralRepository.hasDirectAppointment(doctorStaffId, patientId);
        if (hasDirect) return true;
        return this.referralRepository.hasActiveReferralGrant(doctorStaffId, patientId);
    }

    public async createReferral(
        data: CreateReferralDto,
        referredByStaffId: number,
        isPrivileged: boolean,
        consultationId?: number,
    ) {
        if (!isPrivileged) {
            const hasAccess = await this.hasPatientAccess(referredByStaffId, data.patient_id);
            if (!hasAccess) {
                throw new AppError(403, ErrorCode.FORBIDDEN, "You can only refer patients you currently have access to.");
            }
        }

        return this.referralRepository.create({
            ...data,
            referred_by_staff_id: referredByStaffId,
            consultation_id: consultationId ?? null,
        });
    }

    public async revokeReferral(referralId: number, staffId: number, canRevokeAsPrivileged: boolean) {
        const referral = await this.referralRepository.findById(referralId);
        if (!referral) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Referral not found.");
        }
        if (!canRevokeAsPrivileged && referral.referred_by_staff_id !== staffId) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "Only the referring doctor, Lead Doctor, or Admin can revoke this referral.");
        }
        return this.referralRepository.revoke(referralId, staffId);
    }

    public async getPatientReferrals(patientId: number, staffId: number, isPrivileged: boolean) {
        if (!isPrivileged) {
            const hasAccess = await this.hasPatientAccess(staffId, patientId);
            if (!hasAccess) {
                throw new AppError(403, ErrorCode.FORBIDDEN, "You do not have access to this patient's records.");
            }
        }
        return this.referralRepository.findByPatient(patientId);
    }
}
