import { Router } from "express";

import { appContext } from "../../app.context";
import { HealthController } from "./health.controller";

export const healthRouter = Router();

const healthController = new HealthController(appContext.services.healthService);

healthRouter.get("/", healthController.check.bind(healthController));
