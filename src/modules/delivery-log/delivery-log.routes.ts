import { Router } from "express";
import { DeliveryLogController } from "./delivery-log.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { getDeliveryLogsSchema } from "./delivery-log.schema";
import { appContext } from "app.context";
import { USER_ROLE } from "common/common.schema";

export const deliveryLogRouter = Router();

const deliveryLogController = new DeliveryLogController(appContext.services.eventLogService);

deliveryLogRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    validate(getDeliveryLogsSchema, "query"),
    deliveryLogController.getDeliveryLogs,
);
