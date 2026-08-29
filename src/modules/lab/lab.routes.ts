import { Router } from "express";
import { appContext } from "app.context";
import { LabController } from "./lab.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { enterTestResultSchema } from "./lab.schema";
import { USER_ROLE } from "common/common.schema";

export const labRouter = Router();

const labController = new LabController(appContext.services.labService);

// Reachable by a doctor viewing their own pending/completed lab results —
// the controller enforces the same-doctor ownership check for a DOCTOR-only
// caller, same pattern as the doctor dashboard/schedule self-service routes.
labRouter.get(
    "/doctor/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    labController.getForDoctor,
);

// Reachable by admin/receptionist (transcribing an external lab report) or
// the ordering/treating doctor (recording an in-house quick-test result).
labRouter.patch(
    "/:id/result",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    validate(enterTestResultSchema),
    labController.enterResult,
);
