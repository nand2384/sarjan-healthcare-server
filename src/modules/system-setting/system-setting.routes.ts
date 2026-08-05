import { Router } from "express";

import { appContext } from "app.context";
import { SystemSettingController } from "./system-setting.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE } from "common/common.schema";
import { systemSettingKeyParamSchema, updateSystemSettingSchema } from "./system-setting.schema";

export const systemSettingRouter = Router();

const systemSettingController = new SystemSettingController(appContext.services.systemSettingService);

systemSettingRouter.get(
    "/:key",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(systemSettingKeyParamSchema, "params"),
    systemSettingController.getSetting,
);

systemSettingRouter.patch(
    "/:key",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(systemSettingKeyParamSchema, "params"),
    validate(updateSystemSettingSchema),
    systemSettingController.updateSetting,
);
