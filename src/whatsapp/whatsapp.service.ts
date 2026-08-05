import { logger } from "@logger";
import { whatsappConfig, isWhatsAppConfigured } from "./whatsapp.config";
import { SendAppointmentReminderOptions, SendOtpMessageOptions, WhatsAppTemplateName } from "./whatsapp.types";

interface TemplateComponentParam {
    type: "text";
    text: string;
}

export class WhatsAppService {
    /**
     * Sends a WhatsApp template message via the Meta Cloud API (real HTTP call
     * to graph.facebook.com), or logs the would-be payload if credentials aren't
     * configured. Never throws — a WhatsApp hiccup must not fail the caller's
     * underlying transaction (booking, registration, reminder dispatch).
     */
    private async send(to: string, templateName: string, bodyParams: TemplateComponentParam[]): Promise<void> {
        // Meta's documented format: digits only (country code + number), no leading '+'.
        const normalizedTo = to.replace(/^\+/, "");

        if (!isWhatsAppConfigured) {
            logger.info(
                { to: normalizedTo, templateName, bodyParams },
                "[WhatsApp - not configured, logging only] Would send template message",
            );
            return;
        }

        const url = `https://graph.facebook.com/${whatsappConfig.apiVersion}/${whatsappConfig.phoneNumberId}/messages`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${whatsappConfig.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: normalizedTo,
                    type: "template",
                    template: {
                        name: templateName,
                        language: { code: "en_US" },
                        components: [{ type: "body", parameters: bodyParams }],
                    },
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error({ status: response.status, errorBody, to: normalizedTo, templateName }, "WhatsApp send failed");
            }
        } catch (error) {
            logger.error({ err: error, to: normalizedTo, templateName }, "WhatsApp send threw");
        }
    }

    async sendAppointmentReminder(options: SendAppointmentReminderOptions): Promise<void> {
        await this.send(options.whatsappNumber, WhatsAppTemplateName.APPOINTMENT_REMINDER, [
            { type: "text", text: options.patientName },
            { type: "text", text: options.doctorName },
            { type: "text", text: options.slotTimeFormatted },
            { type: "text", text: options.clinicName },
        ]);
    }

    async sendOtpMessage(options: SendOtpMessageOptions): Promise<void> {
        await this.send(options.whatsappNumber, WhatsAppTemplateName.OTP_AUTHENTICATION, [
            { type: "text", text: options.otpCode },
        ]);
    }
}
