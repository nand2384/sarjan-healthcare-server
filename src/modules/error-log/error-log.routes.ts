import { Router } from "express";
import { ErrorLogController } from "./error-log.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { getErrorLogsSchema } from "./error-log.schema";
import { appContext } from "app.context";
import { USER_ROLE } from "common/common.schema";

export const errorLogRouter = Router();

const errorLogController = new ErrorLogController(appContext.services.eventLogService);

errorLogRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    validate(getErrorLogsSchema, "query"),
    errorLogController.getErrorLogs,
);
