import { Router } from "express";
import { appContext } from "../../app.context";
import { QueueController } from "./queue.controller";
import { authMiddleware, roleMiddleware } from "@middleware";
import { USER_ROLE } from "common/common.schema";

export const queueRouter = Router();

const queueController = new QueueController(appContext.services.eventLogService);

queueRouter.get(
    "/status",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    queueController.status,
);
