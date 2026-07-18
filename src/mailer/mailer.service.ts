import { env } from "@config";

import { mailTransporter } from "./mailer.provider";
import { staffActivationTemplate } from "./mailer.templates";
import { SendMailOptions, SendStaffActivationMailOptions } from "./mailer.types";

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
}