type ReferralEntity = {
    referral_id: number;
    patient_id: number;
    referred_by_staff_id: number;
    referred_to_staff_id: number;
    consultation_id: number | null;
    note: string | null;
    is_active: boolean;
    revoked_by_staff_id: number | null;
    revoked_at: Date | null;
    created_at: Date;
    referred_by_staff?: { staff_id: number; first_name: string; last_name: string } | null;
    referred_to_staff?: { staff_id: number; first_name: string; last_name: string } | null;
    revoked_by_staff?: { staff_id: number; first_name: string; last_name: string } | null;
};

const staffName = (s?: { first_name: string; last_name: string } | null) => (s ? `${s.first_name} ${s.last_name}` : null);

export class ReferralMapper {
    public static toDto(referral: ReferralEntity) {
        return {
            referral_id: referral.referral_id,
            patient_id: referral.patient_id,
            referred_by_staff_id: referral.referred_by_staff_id,
            referred_by_name: staffName(referral.referred_by_staff),
            referred_to_staff_id: referral.referred_to_staff_id,
            referred_to_name: staffName(referral.referred_to_staff),
            consultation_id: referral.consultation_id,
            note: referral.note,
            is_active: referral.is_active,
            revoked_by_staff_id: referral.revoked_by_staff_id,
            revoked_by_name: staffName(referral.revoked_by_staff),
            revoked_at: referral.revoked_at ? referral.revoked_at.toISOString() : null,
            created_at: referral.created_at.toISOString(),
        };
    }
}
