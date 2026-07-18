import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export function validate(schema: ZodType, target: "body" | "query" | "params" = "body") {
    return (req: Request, _res: Response, next: NextFunction) => {
        
        Object.defineProperty(req, target, {
            value: schema.parse(req[target]),
            enumerable: true,
            writable: true,
        });

        next();
    };
}
