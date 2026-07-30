import { z } from "zod";

export const loginSchema = z.object({
    username: z.string().trim().min(3, "Username is required"),
    password: z.string().trim().min(8, "Password is required"),
});

export const activationVerifySchema = z.object({
    activationToken: z.string().trim(),
});

export const activationCompleteSchema = z.object({
    staff_id: z.number(),
    activationToken: z.string().trim(),
    password: z.string().trim().min(8, "Password is required"),
});

export const resendActivationScham = z.object({
    staff_id: z.number(),
});

export const updateProfileSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    mobileNumber: z.string().optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().trim().min(1, "Current password is required"),
    newPassword: z.string().trim().min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().trim().min(8, "Confirm password must be at least 8 characters long"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password cannot be same as current password",
    path: ["newPassword"],
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const resetPasswordVerifySchema = z.object({
    resetToken: z.string().trim(),
});

export const resetPasswordCompleteSchema = z.object({
    staff_id: z.number(),
    resetToken: z.string().trim(),
    password: z.string().trim().min(8, "Password is required"),
    confirmPassword: z.string().trim().min(8, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type ActivationVerifySchema = z.infer<typeof activationVerifySchema>;
export type ActivationCompleteSchema = z.infer<typeof activationCompleteSchema>;
export type ResendActivationSchema = z.infer<typeof resendActivationScham>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordVerifySchema = z.infer<typeof resetPasswordVerifySchema>;
export type ResetPasswordCompleteSchema = z.infer<typeof resetPasswordCompleteSchema>;