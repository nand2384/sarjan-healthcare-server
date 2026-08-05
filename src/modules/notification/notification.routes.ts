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
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DEVELOPER),
    notificationController.getNotifications,
);

notificationRouter.get(
    "/unread-count",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DEVELOPER),
    notificationController.getUnreadCount,
);

notificationRouter.patch(
    "/read-all",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DEVELOPER),
    notificationController.markAllAsRead,
);

notificationRouter.patch(
    "/:id/read",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DEVELOPER),
    validate(idParamSchema, "params"),
    notificationController.markAsRead,
);
