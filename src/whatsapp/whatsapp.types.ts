export interface SendAppointmentReminderOptions {
    appointmentId: number;
    patientName: string;
    whatsappNumber: string;
    doctorName: string;
    slotTimeFormatted: string;
    clinicName: string;
}

export interface SendOtpMessageOptions {
    whatsappNumber: string;
    otpCode: string;
}

export interface SendAppointmentRescheduledOptions {
    appointmentId: number;
    patientName: string;
    whatsappNumber: string;
    doctorName: string;
    newDateFormatted: string;
    newSlotTimeFormatted: string;
    clinicName: string;
}

/**
 * Named once here so renaming a template after Meta approval (their exact
 * approved name may differ from what's submitted) is a one-line change instead
 * of a search-and-replace across call sites.
 */
export const WhatsAppTemplateName = {
    APPOINTMENT_REMINDER: "appointment_reminder",
    OTP_AUTHENTICATION: "otp_authentication",
    APPOINTMENT_RESCHEDULED: "appointment_rescheduled",
} as const;

export const CLINIC_NAME = "Sarjan Healthcare";
