import cors from "cors";

import { env } from "@config";

export const corsMiddleware = cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
});
