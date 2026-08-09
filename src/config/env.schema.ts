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
    PASSKEY_ORIGIN: z.url(),
    PASSKEY_RP_ID: z.string(),
    PASSKEY_RP_NAME: z.string(),
    // Optional: WhatsApp sending degrades to a logging no-op when these are unset
    // (e.g. local dev, or before a Meta Business/test account exists).
    META_WHATSAPP_TOKEN: z.string().optional(),
    META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    META_WHATSAPP_API_VERSION: z.string().default("v20.0"),
    // Optional: file storage (Supabase Storage's S3-compatible API today —
    // same @aws-sdk/client-s3 client works unchanged against real AWS S3
    // later, just by pointing these at a different endpoint/region/bucket).
    // Upload endpoints degrade to a clear "not configured" error when unset,
    // same pattern as the WhatsApp vars above.
    STORAGE_ENDPOINT: z.string().optional(),
    STORAGE_REGION: z.string().optional(),
    STORAGE_ACCESS_KEY_ID: z.string().optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
    STORAGE_BUCKET: z.string().optional(),
    STORAGE_PUBLIC_URL_BASE: z.string().optional(),
    // Deployed-version panel — optionally set explicitly in the hosting
    // platform's env config at deploy time (e.g. Vercel auto-provides
    // VERCEL_GIT_COMMIT_SHA for client builds; map it to GIT_COMMIT_SHA here
    // for whatever platform hosts this server). When unset, health.service.ts
    // falls back to package.json's version and `git rev-parse` (see build-info.ts).
    APP_VERSION: z.string().optional(),
    GIT_COMMIT_SHA: z.string().optional(),
});
