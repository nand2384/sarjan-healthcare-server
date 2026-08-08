import { z } from "zod";

export const createReviewCriterionSchema = z.object({
    label: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
    display_order: z.coerce.number().int().optional(),
});

export const updateReviewCriterionSchema = z.object({
    label: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    display_order: z.coerce.number().int().optional(),
    is_active: z.boolean().optional(),
});
