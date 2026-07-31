import { Router } from "express";

import { appContext } from "app.context";
import { AnnouncementController } from "./announcement.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE, idParamSchema } from "common/common.schema";
import { createAnnouncementSchema } from "./announcement.schema";

export const announcementRouter = Router();

const announcementController = new AnnouncementController(appContext.services.announcementService);

announcementRouter.post(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createAnnouncementSchema),
    announcementController.create,
);

announcementRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    announcementController.list,
);

announcementRouter.patch(
    "/:id/withdraw",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    announcementController.withdraw,
);
