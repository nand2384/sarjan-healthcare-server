import { Router } from "express";

import { appContext } from "../../app.context";
import { HealthController } from "./health.controller";
import { authMiddleware, roleMiddleware } from "@middleware";
import { USER_ROLE } from "common/common.schema";

export const healthRouter = Router();

const healthController = new HealthController(appContext.services.healthService);

healthRouter.get("/", healthController.check);
healthRouter.get("/jobs", authMiddleware, roleMiddleware(USER_ROLE.DEVELOPER), healthController.jobs);
healthRouter.get("/version", authMiddleware, roleMiddleware(USER_ROLE.DEVELOPER), healthController.version);
