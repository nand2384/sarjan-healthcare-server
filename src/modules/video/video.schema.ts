import { z } from "zod";

export const createVideoSchema = z.object({
    video_category_id: z.coerce.number().int(),
    title: z.string().trim().min(1).max(150),
    youtube_url: z.string().trim().url(),
    display_order: z.coerce.number().int().optional(),
});

export const updateVideoSchema = z.object({
    title: z.string().trim().min(1).max(150).optional(),
    youtube_url: z.string().trim().url().optional(),
    display_order: z.coerce.number().int().optional(),
    is_active: z.boolean().optional(),
});
