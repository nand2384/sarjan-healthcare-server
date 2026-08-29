import { z } from "zod";

export const enterTestResultSchema = z.object({
    status: z.enum(["IN_PROGRESS", "COMPLETED"]),
    result_value: z.string().trim().max(2000).optional(),
    result_notes: z.string().trim().max(2000).optional(),
});
