import { z } from "zod";

export const updateAppointmentStatusSchema = z.object({
    status: z.string().trim().min(1, "Status is required")
});

export const sendForTestsSchema = z.object({
    test_catalog_ids: z.array(z.number().int().positive()).min(1, "Select at least one test"),
});

export const rescheduleAppointmentSchema = z.object({
    doctor_availability_id: z.number().int().positive(),
    appointment_date: z.string().trim().min(1, "appointment_date is required"),
});
