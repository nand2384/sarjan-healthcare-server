import { env } from "@config";

import { EventLogService } from "@modules/event-log/event-log.service";
import { mailTransporter } from "./mailer.provider";
import { staffActivationTemplate, doctorFeeMissingTemplate, passwordResetTemplate, emailChangeConfirmationTemplate, announcementTemplate, doctorShiftNoticeTemplate, securityAlertTemplate, accountLockedTemplate } from "./mailer.templates";
import { SendMailOptions, SendStaffActivationMailOptions, SendDoctorFeeMissingAlertOptions, SendPasswordResetMailOptions, SendEmailChangeConfirmationMailOptions, SendAnnouncementMailOptions, SendDoctorShiftNoticeMailOptions, SendSecurityAlertMailOptions, SendAccountLockedMailOptions } from "./mailer.types";

export class MailerService {
    constructor(private readonly eventLogService: EventLogService) {}

    async send({ to, subject, html }: SendMailOptions): Promise<void> {
        try {
            await mailTransporter.sendMail({
                from: env.EMAIL_FROM,
                to,
                subject,
                html,
            });
        } catch (error) {
            this.eventLogService.recordDelivery({
                channel: "EMAIL",
                recipient: to,
                subject_or_template: subject,
                status: "FAILED",
                error_message: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }

        this.eventLogService.recordDelivery({
            channel: "EMAIL",
            recipient: to,
            subject_or_template: subject,
            status: "SENT",
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

    async sendSecurityAlert({
        to,
        developerFirstName,
        staffName,
        username,
        failedAttempts,
        lockedUntilFormatted,
        ipAddress,
    }: SendSecurityAlertMailOptions): Promise<void> {
        await this.send({
            to,
            subject: `Security alert: ${staffName}'s account locked after repeated failed logins`,
            html: securityAlertTemplate({
                developerFirstName,
                staffName,
                username,
                failedAttempts,
                lockedUntilFormatted,
                ipAddress,
            }),
        });
    }

    async sendAccountLockedMail({
        to,
        firstName,
        username,
        failedAttempts,
        lockedUntilFormatted,
        resetLink,
    }: SendAccountLockedMailOptions): Promise<void> {
        await this.send({
            to,
            subject: "Your Sarjan Healthcare account has been locked",
            html: accountLockedTemplate({
                firstName,
                username,
                failedAttempts,
                lockedUntilFormatted,
                resetLink,
            }),
        });
    }
}