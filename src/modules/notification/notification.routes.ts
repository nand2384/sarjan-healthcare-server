import { Router } from "express";

import { appContext } from "app.context";
import { NotificationController } from "./notification.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE, idParamSchema } from "common/common.schema";

export const notificationRouter = Router();

const notificationController = new NotificationController(appContext.services.notificationService);

notificationRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    notificationController.getNotifications,
);

notificationRouter.get(
    "/unread-count",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    notificationController.getUnreadCount,
);

notificationRouter.patch(
    "/:id/read",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(idParamSchema, "params"),
    notificationController.markAsRead,
);
