import { NextFunction, Request, Response } from "express";

import { logger } from "../logger";
import { AppError } from "../errors";
import { ErrorCode } from "../errors";

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
    logger.error(
        {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            error,
        },
        "Unhandled request error.",
    );

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });

        return;
    }

    res.status(500).json({
        success: false,
        error: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: "Something went wrong.",
        },
    });
}
