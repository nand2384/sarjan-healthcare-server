import { Router } from "express";

import { appContext } from "app.context";
import { ReportController } from "./report.controller";
import { authMiddleware, roleMiddleware, validate, reportRateLimiter } from "@middleware";
import { USER_ROLE } from "common/common.schema";
import { createReportSchema, listReportsQuerySchema } from "./report.schema";

export const reportRouter = Router();

const reportController = new ReportController(appContext.services.reportService);

// Any signed-in staff member can file a report; the limiter is per user so one
// stuck button can't flood the developer's inbox.
reportRouter.post(
    "/",
    authMiddleware,
    reportRateLimiter,
    validate(createReportSchema),
    reportController.submit,
);

// Read-only list for the developer dashboard — the safety net for any report
// whose email didn't arrive.
reportRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    validate(listReportsQuerySchema, "query"),
    reportController.list,
);
