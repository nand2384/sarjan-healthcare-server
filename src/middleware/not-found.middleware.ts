import { NextFunction, Request, Response } from "express";
import { AppError, ErrorCode } from "@errors";

export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
    next(new AppError(404, ErrorCode.NOT_FOUND, `Route '${req.originalUrl}' not found.`));
}
