import { Router } from "express";
import { appContext } from "../../app.context";
import { DoctorController } from "./doctor.controller";
import { validate } from "@middleware";
import { createDoctorSchema, updateDoctorSchema } from "./doctor.schema";
import { authMiddleware, roleMiddleware } from "@middleware";
import { USER_ROLE } from "common/common.schema";

export const doctorRouter = Router();

const doctorController = new DoctorController(appContext.services.doctorService);

doctorRouter.get("/", doctorController.getAllDoctors);
doctorRouter.get("/:id", doctorController.getDoctorById);

doctorRouter.post(
    "/create",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createDoctorSchema),
    doctorController.createDoctor.bind(doctorController)
);

doctorRouter.patch(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(updateDoctorSchema),
    doctorController.updateDoctor.bind(doctorController)
);
