import { Router } from "express";

import { authRouter } from "@modules/auth/auth.routes";
import { healthRouter } from "@modules/health/health.routes";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);

export default router;
