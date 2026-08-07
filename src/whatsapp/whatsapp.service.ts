import { logger } from "@logger";
import { whatsappConfig, isWhatsAppConfigured } from "./whatsapp.config";
import { SendAppointmentReminderOptions, SendOtpMessageOptions, WhatsAppTemplateName } from "./whatsapp.types";
import { EventLogService } from "@modules/event-log/event-log.service";

interface TemplateComponentParam {
    type: "text";
    text: string;
}

export class WhatsAppService {
    constructor(private readonly eventLogService: EventLogService) {}

    /**
     * Sends a WhatsApp template message via the Meta Cloud API (real HTTP call
     * to graph.facebook.com), or logs the would-be payload if credentials aren't
     * configured. Never throws — a WhatsApp hiccup must not fail the caller's
     * underlying transaction (booking, registration, reminder dispatch).
     * Returns whether the send actually succeeded, for delivery-log recording
     * — existing callers already discard the return value, so this is safe.
     */
    private async send(to: string, templateName: string, bodyParams: TemplateComponentParam[]): Promise<boolean> {
        // Meta's documented format: digits only (country code + number), no leading '+'.
        const normalizedTo = to.replace(/^\+/, "");

        if (!isWhatsAppConfigured) {
            logger.info(
                { to: normalizedTo, templateName, bodyParams },
                "[WhatsApp - not configured, logging only] Would send template message",
            );
            return true;
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
                this.eventLogService.recordDelivery({
                    channel: "WHATSAPP",
                    recipient: normalizedTo,
                    subject_or_template: templateName,
                    status: "FAILED",
                    error_message: `HTTP ${response.status}: ${errorBody}`.slice(0, 1000),
                });
                return false;
            }

            this.eventLogService.recordDelivery({
                channel: "WHATSAPP",
                recipient: normalizedTo,
                subject_or_template: templateName,
                status: "SENT",
            });
            return true;
        } catch (error) {
            logger.error({ err: error, to: normalizedTo, templateName }, "WhatsApp send threw");
            this.eventLogService.recordDelivery({
                channel: "WHATSAPP",
                recipient: normalizedTo,
                subject_or_template: templateName,
                status: "FAILED",
                error_message: error instanceof Error ? error.message : String(error),
            });
            return false;
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
