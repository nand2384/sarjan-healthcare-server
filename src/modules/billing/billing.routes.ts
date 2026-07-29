import { Router } from "express";

import { appContext } from "app.context";
import { BillingController } from "./billing.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE, idParamSchema } from "common/common.schema";
import { createTestCatalogSchema, updateTestCatalogSchema, updateDoctorFeesSchema } from "./billing.schema";

export const billingRouter = Router();

const billingController = new BillingController(appContext.services.billingService);

// Receptionist-facing: active test catalog for the checkout dropdown
billingRouter.get(
    "/test-catalog",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    billingController.getActiveTestCatalog.bind(billingController),
);

// --- Admin: Test Catalog CRUD ---

billingRouter.get(
    "/admin/test-catalog",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    billingController.getAllAdminTestCatalog.bind(billingController),
);

billingRouter.post(
    "/admin/test-catalog",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createTestCatalogSchema),
    billingController.createTestCatalog.bind(billingController),
);

billingRouter.put(
    "/admin/test-catalog/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    validate(updateTestCatalogSchema),
    billingController.updateTestCatalog.bind(billingController),
);

billingRouter.delete(
    "/admin/test-catalog/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    billingController.deleteTestCatalog.bind(billingController),
);

// --- Admin: Doctor Fees ---

billingRouter.get(
    "/admin/doctors/fees",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    billingController.getDoctorsWithFees.bind(billingController),
);

billingRouter.put(
    "/admin/doctors/:id/fees",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    validate(updateDoctorFeesSchema),
    billingController.updateDoctorFees.bind(billingController),
);
