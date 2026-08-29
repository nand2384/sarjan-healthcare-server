import { z } from "zod";

export const createReferralSchema = z.object({
    patient_id: z.coerce.number().int().positive(),
    referred_to_staff_id: z.coerce.number().int().positive(),
    note: z.string().trim().max(1000).optional(),
});
export type CreateReferralDto = z.infer<typeof createReferralSchema>;
