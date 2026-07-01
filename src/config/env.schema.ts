import { z } from "zod";

export const envSchema = z.object({
    PORT: z.coerce.number().int().positive(),
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    CORS_ORIGIN: z.string().min(1),
    DEFAULT_ADMIN_USERNAME: z.string(),
    DEFAULT_ADMIN_PASSWORD: z.string(),
    DEFAULT_ADMIN_MOBILE_NUMBER: z.coerce.number(),
    DEFAULT_ADMIN_EMAIL: z.string(),
    SESSION_COOKIE_NAME: z.string(),
    SESSION_TTL_SECONDS: z.coerce.number(),
});
