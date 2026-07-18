import nodemailer from "nodemailer";

import { env } from "@config";

export const mailTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
    },
});