import { NextFunction, Request, Response } from "express";

import { logger } from "@logger";
import { AppError, ErrorCode } from "@errors";
import { ZodError } from "zod";

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
    logger.error(
        {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
        },
        "Unhandled request error.",
    );

    if (error instanceof ZodError) {
        res.status(400).json({
            success: false,
            error: {
                code: ErrorCode.VALIDATION_ERROR,
                message: "Validation failed.",
                details: Object.fromEntries(
                    error.issues.map((issue) => [issue.path.join("."), issue.message]),
                ),
            },
        });

        return;
    }

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
