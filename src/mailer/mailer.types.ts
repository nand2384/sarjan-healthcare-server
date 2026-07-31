export interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
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