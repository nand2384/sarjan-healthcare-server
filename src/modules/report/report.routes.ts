import { Router } from "express";

import { appContext } from "app.context";
import { ReportController } from "./report.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE, idParamSchema } from "common/common.schema";
import { createReportSchema, updateReportStatusSchema, listReportsQuerySchema, createReportMessageSchema } from "./report.schema";

export const reportRouter = Router();

const reportController = new ReportController(appContext.services.reportService);

reportRouter.post(
    "/",
    authMiddleware,
    validate(createReportSchema),
    reportController.submit,
);

reportRouter.get(
    "/status-counts",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    reportController.statusCounts,
);

// Registered before GET /:id — literal segments must win over the param route.
reportRouter.get(
    "/mine",
    authMiddleware,
    reportController.listMine,
);

reportRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    validate(listReportsQuerySchema, "query"),
    reportController.list,
);

// Any authenticated staff member — the service authorizes per-report
// (developer OR the report's own reporter), since the reporter could hold
// any role.
reportRouter.get(
    "/:id",
    authMiddleware,
    validate(idParamSchema, "params"),
    reportController.getDetail,
);

reportRouter.post(
    "/:id/messages",
    authMiddleware,
    validate(idParamSchema, "params"),
    validate(createReportMessageSchema),
    reportController.postMessage,
);

reportRouter.patch(
    "/:id/status",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    validate(idParamSchema, "params"),
    validate(updateReportStatusSchema),
    reportController.updateStatus,
);
