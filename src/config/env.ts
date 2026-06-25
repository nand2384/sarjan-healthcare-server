import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["PORT", "NODE_ENV"];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

export const env = Object.freeze({
    PORT: Number(process.env.PORT),
    NODE_ENV: process.env.NODE_ENV!,
});
