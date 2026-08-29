type StaffRef = { staff_id: number; first_name: string; last_name: string } | null;

type ConsultationEntity = {
    consultation_id: number;
    appointment_id: number;
    patient_id: number;
    doctor_staff_id: number;
    vitals: unknown;
    symptoms_list: unknown;
    symptoms_notes: string | null;
    diet: string | null;
    sleep: string | null;
    lifestyle: string | null;
    reported_allergies: string[];
    history_list: unknown;
    ongoing_medications: unknown;
    cvs_heart_sounds: string | null;
    cvs_murmurs: string | null;
    rs_air_entry: string | null;
    rs_added_sounds: string | null;
    diagnosis_list: string[];
    diagnosis_notes: string | null;
    selected_tests: string[];
    prescribed_meds: unknown;
    prescription_advice: string | null;
    follow_up_days: number | null;
    referred_to_staff_id: number | null;
    created_at: Date;
    doctor?: StaffRef;
    referred_to_staff?: StaffRef;
};

export class ConsultationMapper {
    public static toDto(c: ConsultationEntity) {
        return {
            consultation_id: c.consultation_id,
            appointment_id: c.appointment_id,
            patient_id: c.patient_id,
            doctor_staff_id: c.doctor_staff_id,
            doctor_name: c.doctor ? `${c.doctor.first_name} ${c.doctor.last_name}` : null,
            vitals: c.vitals,
            symptoms_list: c.symptoms_list,
            symptoms_notes: c.symptoms_notes,
            diet: c.diet,
            sleep: c.sleep,
            lifestyle: c.lifestyle,
            reported_allergies: c.reported_allergies,
            history_list: c.history_list,
            ongoing_medications: c.ongoing_medications,
            cvs_heart_sounds: c.cvs_heart_sounds,
            cvs_murmurs: c.cvs_murmurs,
            rs_air_entry: c.rs_air_entry,
            rs_added_sounds: c.rs_added_sounds,
            diagnosis_list: c.diagnosis_list,
            diagnosis_notes: c.diagnosis_notes,
            selected_tests: c.selected_tests,
            prescribed_meds: c.prescribed_meds,
            prescription_advice: c.prescription_advice,
            follow_up_days: c.follow_up_days,
            referred_to_staff_id: c.referred_to_staff_id,
            referred_to_name: c.referred_to_staff ? `${c.referred_to_staff.first_name} ${c.referred_to_staff.last_name}` : null,
            created_at: c.created_at.toISOString(),
        };
    }
}
