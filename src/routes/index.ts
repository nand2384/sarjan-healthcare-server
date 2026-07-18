import { Router } from "express";

import { authRouter } from "@modules/auth/auth.routes";
import { auditRouter } from "@modules/audit/audit.routes";
import { healthRouter } from "@modules/health/health.routes";
import { staffRouter } from "@modules/staff/staff.routes";
import { masterRouter } from "@modules/master/master.routes";
import { doctorRouter } from "@modules/doctor/doctor.routes";

// Remove on removing redis/clear API
import { env } from "node:process";
import { AppError, ErrorCode } from "@errors";
import { redisClient } from "@cache";

const router = Router();

router.use("/health", healthRouter);
router.use("/audit", auditRouter);
router.use("/master", masterRouter);
router.use("/auth", authRouter);
router.use("/staff", staffRouter);
router.use("/doctors", doctorRouter);

router.get("/dev/redis/clear", async (_req, res, next) => {
    try {
        if (env.NODE_ENV !== "development") {
            throw new AppError(
                404,
                ErrorCode.NOT_FOUND,
                "Not found.",
            );
        }

        await redisClient.flushDb();

        return res.status(200).json({
            message: "Redis cache cleared successfully.",
        });
    } catch (error) {
        next(error);
    }
});

export default router;
