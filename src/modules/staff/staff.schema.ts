import { z } from "zod";

export const createStaffSchema = z.object({
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    username: z.string().trim().min(3, "Username must be at least 3 characters"),
    email: z.email("Invalid email address").trim(),
    mobile_number: z.e164(),
    gender_id: z.coerce.number().int().positive(),
    age: z.coerce.number().int().min(1).max(120).optional(),
    street_address: z.string().trim().min(1, "Street address is required").optional(),
    city: z.string().trim().min(1, "City is required").optional(),
    state: z.string().trim().min(1, "State is required").optional(),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits").optional(),
    role_id: z.coerce.number().int().positive(),
});

export type CreateStaffSchema = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema.partial().extend({
    is_disabled: z.boolean().optional()
});
export type UpdateStaffDto = z.infer<typeof updateStaffSchema>;

export const updateStaffRolesSchema = z.object({
    roles: z.array(z.coerce.number().int().positive()).min(1, "At least one role is required")
});
export type UpdateStaffRolesDto = z.infer<typeof updateStaffRolesSchema>;