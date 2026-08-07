import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { errorHandler, notFoundMiddleware, rateLimiter, corsMiddleware, requestIdMiddleware, requestLoggerMiddleware, maintenanceMiddleware } from "./middleware";
import router from "./routes";

import { env } from "@config";

const app = express();

let trustProxy: string | number | boolean = env.TRUST_PROXY;
if (trustProxy === "true") trustProxy = true;
else if (trustProxy === "false") trustProxy = false;
else if (!isNaN(Number(trustProxy))) trustProxy = Number(trustProxy);

app.set('trust proxy', trustProxy);

app.use(corsMiddleware);
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter);
app.use(maintenanceMiddleware);

app.use("/api", router);
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Keep Alive",
    });
});

app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
