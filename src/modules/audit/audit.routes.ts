import { Router } from "express";
import { AuditController } from "./audit.controller";
import { authMiddleware, validate } from "@middleware";
import { getAuditLogsSchema } from "./audit.schema";
import { appContext } from "app.context";

const auditRouter = Router();

const auditController = new AuditController(appContext.services.auditService);

auditRouter.get(
    "/",
    authMiddleware,
    validate(getAuditLogsSchema, "query"),
    auditController.getAuditLogs.bind(auditController)
);

export { auditRouter };
