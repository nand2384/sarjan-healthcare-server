import { z } from "zod";

export const updateClinicProfileSchema = z.object({
    address: z.string().trim().min(1).max(500).optional(),
    phone: z.string().trim().min(1).max(30).optional(),
    email: z.email().optional(),
    timings: z.string().trim().min(1).max(200).optional(),
    days_open: z.string().trim().min(1).max(200).optional(),
    about_description: z.string().trim().min(1).max(4000).optional(),
});
