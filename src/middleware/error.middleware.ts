import { NextFunction, Request, Response } from "express";

import { logger } from "@logger";
import { AppError, ErrorCode } from "@errors";
import { ZodError } from "zod";
import { Prisma } from "@generated/prisma/client";
import { appContext } from "app.context";

function persistIfServerError(statusCode: number, error: Error, req: Request): void {
    if (statusCode < 500) return;

    appContext.services.eventLogService.recordError({
        request_id: req.requestId,
        method: req.method,
        url: req.originalUrl,
        status_code: statusCode,
        message: error.message,
        stack: error.stack,
    });
}

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

    if (error instanceof SyntaxError && "body" in error) {
        res.status(400).json({
            success: false,
            error: {
                code: ErrorCode.BAD_REQUEST,
                message: "Invalid JSON payload passed.",
            },
        });

        return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            res.status(409).json({
                success: false,
                error: {
                    code: ErrorCode.CONFLICT,
                    message: "A record with this value already exists.",
                    details: error.meta?.target,
                },
            });
            return;
        }

        if (error.code === "P2025") {
            res.status(404).json({
                success: false,
                error: {
                    code: ErrorCode.NOT_FOUND,
                    message: "Record not found.",
                },
            });
            return;
        }

        res.status(400).json({
            success: false,
            error: {
                code: ErrorCode.BAD_REQUEST,
                message: "Database operation failed.",
            },
        });
        return;
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        res.status(400).json({
            success: false,
            error: {
                code: ErrorCode.BAD_REQUEST,
                message: "Database validation failed.",
            },
        });
        return;
    }

    if (error instanceof AppError) {
        persistIfServerError(error.statusCode, error, req);

        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
            },
        });

        return;
    }

    persistIfServerError(500, error, req);

    res.status(500).json({
        success: false,
        error: {
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: "Something went wrong.",
        },
    });
}
