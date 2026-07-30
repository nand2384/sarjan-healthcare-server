import { Router } from "express";

import { appContext } from "app.context";
import { FinanceController } from "./finance.controller";
import { authMiddleware, roleMiddleware } from "@middleware";
import { USER_ROLE } from "common/common.schema";

export const financeRouter = Router();

const financeController = new FinanceController(appContext.services.financeService);

financeRouter.get(
    "/summary",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    financeController.getSummary.bind(financeController)
);

financeRouter.get(
    "/doctors/:staffId/payments",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    financeController.getDoctorPayments.bind(financeController)
);
