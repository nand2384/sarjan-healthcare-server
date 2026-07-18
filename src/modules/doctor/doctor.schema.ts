import { z } from "zod";

const e164 = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid E.164 phone number format");

export const createDoctorSchema = z.object({
    // Staff details
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    username: z.string().trim().min(3, "Username must be at least 3 characters"),
    email: z.email("Invalid email address").trim(),
    mobile_number: e164,
    gender_id: z.coerce.number().int().positive(),
    age: z.coerce.number().int().min(1).max(120).optional(),
    street_address: z.string().trim().min(1, "Street address is required").optional(),
    city: z.string().trim().min(1, "City is required").optional(),
    state: z.string().trim().min(1, "State is required").optional(),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits").optional(),

    // Doctor profile details
    specialization: z.string().trim().min(1, "Specialization is required"),
    qualification: z.string().trim().min(1, "Qualification is required"),
    registration_number: z.string().trim().optional(),
    biography: z.string().trim().optional(),
    experience: z.string().trim().optional(),
    is_visible_on_website: z.boolean().default(true),
    is_accepting_appointments: z.boolean().default(true),
    display_order: z.coerce.number().int().default(0),
});

export type CreateDoctorSchema = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = createDoctorSchema.partial().extend({
    is_disabled: z.boolean().optional()
});
export type UpdateDoctorDto = z.infer<typeof updateDoctorSchema>;
