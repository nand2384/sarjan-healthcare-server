import { z } from "zod";

const vitalsSchema = z
    .object({
        height: z.string().optional(),
        weight: z.string().optional(),
        bp: z.string().optional(),
        temp: z.string().optional(),
        pulse: z.string().optional(),
        respiratoryRate: z.string().optional(),
        spo2: z.string().optional(),
    })
    .optional();

const symptomItemSchema = z.object({
    name: z.string(),
    duration: z.string(),
    severity: z.enum(["Mild", "Moderate", "Severe"]),
});

const historyItemSchema = z.object({
    name: z.string(),
    type: z.enum(["Self", "Family"]),
    notes: z.string().optional(),
});

const ongoingMedicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
});

const prescribedMedicationSchema = z.object({
    id: z.string(),
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string(),
});

export const createConsultationSchema = z.object({
    appointment_id: z.coerce.number().int().positive(),

    vitals: vitalsSchema,

    symptoms_list: z.array(symptomItemSchema).default([]),
    symptoms_notes: z.string().trim().optional(),

    diet: z.string().trim().optional(),
    sleep: z.string().trim().optional(),
    lifestyle: z.string().trim().optional(),

    reported_allergies: z.array(z.string().trim()).default([]),

    history_list: z.array(historyItemSchema).default([]),
    ongoing_medications: z.array(ongoingMedicationSchema).default([]),

    cvs_heart_sounds: z.string().trim().optional(),
    cvs_murmurs: z.string().trim().optional(),
    rs_air_entry: z.string().trim().optional(),
    rs_added_sounds: z.string().trim().optional(),

    diagnosis_list: z.array(z.string().trim()).default([]),
    diagnosis_notes: z.string().trim().optional(),

    selected_tests: z.array(z.string().trim()).default([]),

    prescribed_meds: z.array(prescribedMedicationSchema).default([]),
    prescription_advice: z.string().trim().optional(),

    follow_up_days: z.coerce.number().int().nonnegative().optional(),

    referred_to_staff_id: z.coerce.number().int().positive().optional(),
    referral_note: z.string().trim().max(1000).optional(),
});
export type CreateConsultationDto = z.infer<typeof createConsultationSchema>;
