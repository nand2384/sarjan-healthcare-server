import { z } from "zod";

export const envSchema = z.object({
    PORT: z.coerce.number().int().positive(),
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.url(),
    CORS_ORIGIN: z.string().min(1),
});
