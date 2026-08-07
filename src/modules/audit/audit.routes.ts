import { Router } from "express";
import { AuditController } from "./audit.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { getAuditLogsSchema } from "./audit.schema";
import { appContext } from "app.context";
import { USER_ROLE } from "common/common.schema";

const auditRouter = Router();

const auditController = new AuditController(appContext.services.auditService);

auditRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DEVELOPER),
    validate(getAuditLogsSchema, "query"),
    auditController.getAuditLogs.bind(auditController)
);

export { auditRouter };
