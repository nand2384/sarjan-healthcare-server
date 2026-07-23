import { z } from "zod";

const e164Regex = /^\+[1-9]\d{1,14}$/;

export const registerAndBookSchema = z.object({
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    mobile_number: z.string().regex(e164Regex, "Invalid mobile_number. Must be in E.164 format (e.g. +919876543210).").optional(),
    whatsapp_number: z.string().regex(e164Regex, "Invalid whatsapp_number. Must be in E.164 format (e.g. +919876543210).").optional(),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    gender_id: z.coerce.number().int().positive().optional(),
    age: z.coerce.number().int().min(1).max(150).optional(),
    street_address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits").optional().or(z.literal('')),
    is_account_complete: z.boolean(),

    mode: z.literal('call').or(z.literal('walk-in')),
    doctor_staff_id: z.coerce.number().int().positive(),
    doctor_availability_id: z.coerce.number().int().positive(),
    appointment_date: z.string(), // ISO date
    visit_reason_id: z.coerce.number().int().positive()
});

export const bookAppointmentSchema = z.object({
    doctor_staff_id: z.coerce.number().int().positive(),
    doctor_availability_id: z.coerce.number().int().positive(),
    appointment_date: z.string(),
    visit_reason_id: z.coerce.number().int().positive()
});

export const registerWalkInSchema = z.object({
    first_name: z.string().trim().min(1, "First name is required"),
    last_name: z.string().trim().min(1, "Last name is required"),
    mobile_number: z.string().regex(e164Regex, "Invalid mobile_number. Must be in E.164 format (e.g. +919876543210).").optional(),
    whatsapp_number: z.string().regex(e164Regex, "Invalid whatsapp_number. Must be in E.164 format (e.g. +919876543210).").optional(),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    gender_id: z.coerce.number().int().positive().optional(),
    age: z.coerce.number().int().min(1).max(150).optional(),
    street_address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits").optional().or(z.literal('')),
    is_account_complete: z.boolean(),

    mode: z.literal('walk-in'),
    doctor_staff_id: z.coerce.number().int().positive(),
    current_time: z.string(), // ISO date time
    visit_reason_id: z.coerce.number().int().positive()
});

export const updateProfileSchema = z.object({
    mobile_number: z.string().regex(e164Regex, "Invalid mobile_number. Must be in E.164 format (e.g. +919876543210).").optional(),
    whatsapp_number: z.string().regex(e164Regex, "Invalid whatsapp_number. Must be in E.164 format (e.g. +919876543210).").optional(),
    email: z.string().email("Invalid email").optional().or(z.literal('')),
    gender_id: z.coerce.number().int().positive().optional(),
    age: z.coerce.number().int().min(1).max(150).optional(),
    street_address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits").optional().or(z.literal('')),
});
