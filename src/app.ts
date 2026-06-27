import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import {
    errorHandler,
    notFoundMiddleware,
    rateLimiter,
    corsMiddleware,
    requestIdMiddleware,
    requestLoggerMiddleware,
} from "./middleware";
import router from "./routes";

const app = express();

app.use(express.json());

app.use(corsMiddleware);
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(rateLimiter);

app.use("/api", router);

app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
