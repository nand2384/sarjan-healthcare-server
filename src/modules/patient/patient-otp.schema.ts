import { z } from "zod";

const e164Regex = /^\+[1-9]\d{1,14}$/;

export const sendPatientOtpSchema = z.object({
    whatsapp_number: z.string().regex(e164Regex, "Invalid whatsapp_number. Must be in E.164 format (e.g. +919876543210)."),
});

export const verifyPatientOtpSchema = z.object({
    whatsapp_number: z.string().regex(e164Regex, "Invalid whatsapp_number. Must be in E.164 format (e.g. +919876543210)."),
    code: z.string().regex(/^\d{6}$/, "OTP code must be 6 digits"),
});
