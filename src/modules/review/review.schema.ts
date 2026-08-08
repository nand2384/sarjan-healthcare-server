import { z } from "zod";

export const submitReviewSchema = z.object({
    message: z.string().trim().max(2000).optional(),
    is_public: z.boolean().default(false),
    source: z.enum(["LINK", "RECEPTIONIST_QR", "PATIENT_DASHBOARD"]),
    ratings: z
        .array(
            z.object({
                criterion_id: z.number().int().positive(),
                stars: z.number().int().min(1).max(5),
            }),
        )
        .min(1, "At least one rating is required"),
});

export const getReviewsSchema = z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    is_public: z.coerce.boolean().optional(),
    doctor_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
});

export const updateReviewVisibilitySchema = z.object({
    is_public: z.boolean(),
});
