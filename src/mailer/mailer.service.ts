import { env } from "@config";

import { mailTransporter } from "./mailer.provider";
import { staffActivationTemplate, doctorFeeMissingTemplate } from "./mailer.templates";
import { SendMailOptions, SendStaffActivationMailOptions, SendDoctorFeeMissingAlertOptions } from "./mailer.types";

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
}