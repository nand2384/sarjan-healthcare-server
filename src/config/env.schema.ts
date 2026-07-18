import { z } from "zod";

export const envSchema = z.object({
    PORT: z.coerce.number().int().positive(),
    NODE_ENV: z.enum(["development", "production", "test"]),
    SALT_ROUNDS: z.coerce.number(),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    FRONTEND_URL: z.string().min(1),
    DEFAULT_ADMIN_USERNAME: z.string(),
    DEFAULT_ADMIN_PASSWORD: z.string(),
    DEFAULT_ADMIN_MOBILE_NUMBER: z.string(),
    DEFAULT_ADMIN_EMAIL: z.string(),
    SESSION_COOKIE_NAME: z.string(),
    SESSION_TTL_SECONDS: z.coerce.number(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_SECURE: z.coerce.boolean(),
    EMAIL_USER: z.email(),
    EMAIL_PASS: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    TRUST_PROXY: z.string().default("1"),
});
