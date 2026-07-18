import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
        res.status(options.statusCode).json({
            success: false,
            error: {
                code: "TOO_MANY_REQUESTS",
                message: options.message,
            },
        });
    },
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
        res.status(options.statusCode).json({
            success: false,
            error: {
                code: "TOO_MANY_REQUESTS",
                message: "Too many authentication attempts. Please try again later.",
            },
        });
    },
});
