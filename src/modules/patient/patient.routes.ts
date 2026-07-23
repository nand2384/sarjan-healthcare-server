import { Router } from "express";
import { appContext } from "../../app.context";
import { PatientController } from "./patient.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { USER_ROLE } from "common/common.schema";
import { registerAndBookSchema, registerWalkInSchema, updateProfileSchema, bookAppointmentSchema } from "./patient.schema";

export const patientRouter = Router();

const patientController = new PatientController(appContext.services.patientService);

// GET /patients/search
patientRouter.get(
    "/search",
    authMiddleware,
    roleMiddleware(USER_ROLE.RECEPTIONIST, USER_ROLE.ADMIN),
    patientController.searchPatients.bind(patientController)
);

// POST /patients/:id/appointments
patientRouter.post(
    "/:id/appointments",
    authMiddleware,
    roleMiddleware(USER_ROLE.RECEPTIONIST, USER_ROLE.ADMIN),
    validate(bookAppointmentSchema),
    patientController.bookAppointment.bind(patientController)
);

// POST /patients/register-and-book
patientRouter.post(
    "/register-and-book",
    authMiddleware,
    roleMiddleware(USER_ROLE.RECEPTIONIST, USER_ROLE.ADMIN),
    validate(registerAndBookSchema),
    patientController.registerAndBook.bind(patientController)
);

// POST /patients/walk-in
patientRouter.post(
    "/walk-in",
    authMiddleware,
    roleMiddleware(USER_ROLE.RECEPTIONIST, USER_ROLE.ADMIN),
    validate(registerWalkInSchema),
    patientController.registerWalkIn.bind(patientController)
);

// PATCH /patients/:id/profile
patientRouter.patch(
    "/:id/profile",
    authMiddleware,
    roleMiddleware(USER_ROLE.RECEPTIONIST, USER_ROLE.ADMIN),
    validate(updateProfileSchema),
    patientController.updateProfile.bind(patientController)
);
