import cors from "cors";

import { env } from "@config";

export const corsMiddleware = cors({
    origin: env.FRONTEND_URL,
    credentials: true,
});
