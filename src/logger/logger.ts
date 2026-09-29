import pino from "pino";
import { env } from "@config";

const logger = pino({
    level: env.NODE_ENV === "development" ? "debug" : "info",
    transport:
        env.NODE_ENV === "development"
            ? {
                  target: "pino-pretty",
                  options: {
                      colorize: true,
                      translateTime: "SYS:HH:MM:ss",
                      ignore: "pid,hostname",
                  },
              }
            : undefined,
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "authorization",
            "cookie",
            "password",
            "confirmPassword",
            "accessToken",
            "refreshToken",
            "token",
            // PII: WhatsApp/email recipient, phone numbers, and template
            // params (which can carry an OTP code, patient/doctor names,
            // etc. — see whatsapp.service.ts). Redact wholesale rather than
            // picking fields out of bodyParams' array shape.
            "to",
            "whatsappNumber",
            "bodyParams",
            "email",
        ],
        remove: true,
    },
});

export default logger;
