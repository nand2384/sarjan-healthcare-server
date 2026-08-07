import { Router } from "express";

import { appContext } from "app.context";
import { StaffController } from "./staff.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE, idParamSchema } from "common/common.schema";
import { createStaffSchema, updateStaffRolesSchema, updateStaffSchema } from "./staff.schema";

export const staffRouter = Router();

const staffController = new StaffController(appContext.services.staffService);

// POST /staff/create
staffRouter.post(
    "/create",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createStaffSchema),
    staffController.createStaff.bind(staffController),
);

// GET /staff
staffRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    staffController.getAllStaff.bind(staffController),
);

// GET /staff/:id
staffRouter.get(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    staffController.getStaffById.bind(staffController),
);

// PATCH /staff/:id
staffRouter.patch(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    validate(updateStaffSchema),
    staffController.updateStaff.bind(staffController),
);

// PATCH /staff/:id/roles
staffRouter.patch(
    "/:id/roles",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    validate(updateStaffRolesSchema),
    staffController.updateStaffRoles.bind(staffController),
);

// PATCH /staff/:id/disable
staffRouter.patch(
    "/:id/disable",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    staffController.disableStaff.bind(staffController),
);

// PATCH /staff/:id/restore
staffRouter.patch(
    "/:id/restore",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    staffController.restoreStaff.bind(staffController),
);

// PATCH /staff/:id/unlock
staffRouter.patch(
    "/:id/unlock",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    staffController.unlockStaff.bind(staffController),
);

// DELETE /staff/:id
staffRouter.delete(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    staffController.deleteStaff.bind(staffController),
);

// POST /staff/bulk/disable
staffRouter.post(
    "/bulk/disable",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    staffController.bulkDisableStaff.bind(staffController),
);

// POST /staff/bulk/delete
staffRouter.post(
    "/bulk/delete",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    staffController.bulkDeleteStaff.bind(staffController),
);

// POST /staff/:id/password-reset
staffRouter.post(
    "/:id/password-reset",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    staffController.triggerPasswordReset.bind(staffController),
);