import { env } from "@config";

import { mailTransporter } from "./mailer.provider";
import { staffActivationTemplate, doctorFeeMissingTemplate, passwordResetTemplate, emailChangeConfirmationTemplate, announcementTemplate, doctorShiftNoticeTemplate } from "./mailer.templates";
import { SendMailOptions, SendStaffActivationMailOptions, SendDoctorFeeMissingAlertOptions, SendPasswordResetMailOptions, SendEmailChangeConfirmationMailOptions, SendAnnouncementMailOptions, SendDoctorShiftNoticeMailOptions } from "./mailer.types";

export class MailerService {
    async send({ to, subject, html }: SendMailOptions): Promise<void> {
        await mailTransporter.sendMail({
            from: env.EMAIL_FROM,
            to,
            subject,
            html,
        });
    }

    async sendStaffActivationMail({
        to,
        firstName,
        username,
        activationLink,
    }: SendStaffActivationMailOptions): Promise<void> {
        await this.send({
            to,
            subject: "Activate your Sarjan Healthcare account",
            html: staffActivationTemplate({
                firstName,
                username,
                activationLink,
            }),
        });
    }

    async sendDoctorFeeMissingAlert({ to, doctorName }: SendDoctorFeeMissingAlertOptions): Promise<void> {
        await this.send({
            to,
            subject: "Action required: Doctor consultation fees not configured",
            html: doctorFeeMissingTemplate({ doctorName }),
        });
    }

    async sendPasswordResetMail({
        to,
        firstName,
        username,
        resetLink,
    }: SendPasswordResetMailOptions): Promise<void> {
        await this.send({
            to,
            subject: "Reset your Sarjan Healthcare password",
            html: passwordResetTemplate({
                firstName,
                username,
                resetLink,
            }),
        });
    }

    async sendEmailChangeConfirmationMail({
        to,
        firstName,
        username,
        confirmLink,
    }: SendEmailChangeConfirmationMailOptions): Promise<void> {
        await this.send({
            to,
            subject: "Confirm your new Sarjan Healthcare email address",
            html: emailChangeConfirmationTemplate({
                firstName,
                username,
                confirmLink,
            }),
        });
    }

    async sendAnnouncementMail({
        to,
        firstName,
        message,
        type,
    }: SendAnnouncementMailOptions): Promise<void> {
        const subject = type === "danger" ? "Urgent announcement from Sarjan Healthcare" : "New announcement from Sarjan Healthcare";

        await this.send({
            to,
            subject,
            html: announcementTemplate({
                firstName,
                message,
                type,
            }),
        });
    }

    async sendDoctorShiftNotice({
        to,
        firstName,
        appointmentCount,
        firstSlotTime,
    }: SendDoctorShiftNoticeMailOptions): Promise<void> {
        await this.send({
            to,
            subject: "Your Sarjan Healthcare shift notice for tomorrow",
            html: doctorShiftNoticeTemplate({
                firstName,
                appointmentCount,
                firstSlotTime,
            }),
        });
    }
}