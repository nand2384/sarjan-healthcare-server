import { NextFunction, Request, Response } from "express";

import { createRequestLogger } from "@logger";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    const requestLogger = createRequestLogger(req.requestId);

    res.on("finish", () => {
        const duration = Date.now() - start;

        requestLogger.info({
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        });
    });

    next();
}
