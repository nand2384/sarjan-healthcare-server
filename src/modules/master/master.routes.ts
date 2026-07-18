import { Router } from "express";

import { appContext } from "app.context";
import { MasterController } from "./master.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE, idParamSchema, masterValueParamSchema } from "common/common.schema";
import { 
    createMainMasterSchema, 
    updateMainMasterSchema, 
    createValueMasterSchema, 
    updateValueMasterSchema, 
    createRoleMasterSchema, 
    updateRoleMasterSchema 
} from "./master.schema";

export const masterRouter = Router();

const masterController = new MasterController(appContext.services.masterService);

// Public dropdown endpoint
masterRouter.get("/", masterController.getMasters.bind(masterController));

// --- Admin Endpoints ---

masterRouter.get(
    "/admin/all",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    masterController.getAllAdminMasters.bind(masterController),
);

masterRouter.get(
    "/admin/roles",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    masterController.getAllAdminRoles.bind(masterController),
);

// --- Main Master CRUD ---

masterRouter.post(
    "/main",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createMainMasterSchema),
    masterController.createMainMaster.bind(masterController),
);

masterRouter.patch(
    "/main/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    validate(updateMainMasterSchema),
    masterController.updateMainMaster.bind(masterController),
);

masterRouter.delete(
    "/main/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    masterController.deleteMainMaster.bind(masterController),
);

// --- Value Master CRUD ---

masterRouter.post(
    "/value",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createValueMasterSchema),
    masterController.createValueMaster.bind(masterController),
);

masterRouter.patch(
    "/value/:masterId/:valueId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(masterValueParamSchema, "params"),
    validate(updateValueMasterSchema),
    masterController.updateValueMaster.bind(masterController),
);

masterRouter.delete(
    "/value/:masterId/:valueId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(masterValueParamSchema, "params"),
    masterController.deleteValueMaster.bind(masterController),
);

// --- Role CRUD ---

masterRouter.post(
    "/role",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createRoleMasterSchema),
    masterController.createRole.bind(masterController),
);

masterRouter.patch(
    "/role/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    validate(updateRoleMasterSchema),
    masterController.updateRole.bind(masterController),
);

masterRouter.delete(
    "/role/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(idParamSchema, "params"),
    masterController.deleteRole.bind(masterController),
);