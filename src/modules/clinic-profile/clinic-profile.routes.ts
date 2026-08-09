import { Router } from "express";
import { appContext } from "app.context";
import { ClinicProfileController } from "./clinic-profile.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { updateClinicProfileSchema } from "./clinic-profile.schema";
import { USER_ROLE } from "common/common.schema";

export const clinicProfileRouter = Router();

const clinicProfileController = new ClinicProfileController(appContext.services.clinicProfileService);

clinicProfileRouter.get("/", authMiddleware, roleMiddleware(USER_ROLE.ADMIN), clinicProfileController.get);
clinicProfileRouter.patch("/", authMiddleware, roleMiddleware(USER_ROLE.ADMIN), validate(updateClinicProfileSchema), clinicProfileController.update);
