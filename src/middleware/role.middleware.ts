import { NextFunction, Request, Response } from "express";

import { AppError, ErrorCode } from "@errors";
import { UserRole } from "common/common.schema";

export function roleMiddleware(...allowedRoles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const roles = req.session?.roles ?? [];
        const hasRole = roles.some((role) => allowedRoles.includes(role as UserRole));

        if (!hasRole) {
            throw new AppError(
                403,
                ErrorCode.FORBIDDEN,
                "You do not have permission to perform this action.",
            );
        }

        next();
    };
}
