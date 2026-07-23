import { z } from "zod";

export const updateAppointmentStatusSchema = z.object({
    status: z.string().trim().min(1, "Status is required")
});
