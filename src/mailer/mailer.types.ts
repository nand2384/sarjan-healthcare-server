export interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
}

export interface SendBugReportMailOptions {
    to: string;
    replyTo?: string;
    reportId: number;
    reporterName: string;
    reporterRoles: string[];
    reporterUsername: string;
    pageLabel: string;
    pagePath: string;
    description: string;
    userAgent?: string;
    submittedAtFormatted: string;
    serverVersion: string;
}

export interface SendStaffActivationMailOptions {
    to: string;
    firstName: string;
    username: string;
    activationLink: string;
}

export interface SendDoctorFeeMissingAlertOptions {
    to: string;
    doctorName: string;
}

export interface SendPasswordResetMailOptions {
    to: string;
    firstName: string;
    username: string;
    resetLink: string;
}

export interface SendEmailChangeConfirmationMailOptions {
    to: string;
    firstName: string;
    username: string;
    confirmLink: string;
}

export interface SendAnnouncementMailOptions {
    to: string;
    firstName: string;
    message: string;
    type: "info" | "warning" | "danger";
}

export interface SendDoctorShiftNoticeMailOptions {
    to: string;
    firstName: string;
    appointmentCount: number;
    firstSlotTime: string;
}

export interface SendSecurityAlertMailOptions {
    to: string;
    developerFirstName: string;
    staffName: string;
    username: string;
    failedAttempts: number;
    lockedUntilFormatted: string;
    ipAddress?: string;
}

export interface SendAccountLockedMailOptions {
    to: string;
    firstName: string;
    username: string;
    failedAttempts: number;
    lockedUntilFormatted: string;
    resetLink: string;
}