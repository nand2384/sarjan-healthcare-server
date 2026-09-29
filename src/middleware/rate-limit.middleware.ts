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

// Keyed by the signed-in staff member (runs after authMiddleware), not by IP —
// a whole clinic can share one address.
export const reportRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `report:${req.session?.staff_id ?? "anonymous"}`,
    handler: (_req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: "TOO_MANY_REQUESTS",
                message: "You've sent several reports recently. Please wait a while before sending another.",
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
