import { Router } from "express";
import { appContext } from "app.context";
import { SessionController } from "./session.controller";
import { authMiddleware, roleMiddleware } from "@middleware";
import { USER_ROLE } from "common/common.schema";

export const sessionRouter = Router();

const sessionController = new SessionController(appContext.services.sessionService);

sessionRouter.get(
    "/active",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DEVELOPER),
    sessionController.getAllActive,
);

sessionRouter.delete(
    "/:sessionId/force",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DEVELOPER),
    sessionController.forceRevoke,
);
