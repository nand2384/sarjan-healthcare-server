import { env } from "@config";

export const whatsappConfig = {
    token: env.META_WHATSAPP_TOKEN,
    phoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID,
    apiVersion: env.META_WHATSAPP_API_VERSION,
};

/**
 * True only once real Meta Cloud API credentials are present. Until then,
 * WhatsAppService logs the would-be message instead of sending it — safe for
 * local dev, and the exact same code path once credentials are added (see
 * README/plan notes: swapping to production Meta access is a config change,
 * not a code change).
 */
export const isWhatsAppConfigured = !!(whatsappConfig.token && whatsappConfig.phoneNumberId);
