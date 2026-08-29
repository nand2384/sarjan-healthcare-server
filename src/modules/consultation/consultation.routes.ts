import { Router } from "express";
import { appContext } from "app.context";
import { ConsultationController } from "./consultation.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { createConsultationSchema } from "./consultation.schema";
import { USER_ROLE } from "common/common.schema";

export const consultationRouter = Router();

const consultationController = new ConsultationController(appContext.services.consultationService);

const consultationRoles = roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR);

consultationRouter.post(
    "/",
    authMiddleware,
    consultationRoles,
    validate(createConsultationSchema),
    consultationController.createConsultation,
);

consultationRouter.get(
    "/patient/:patientId",
    authMiddleware,
    consultationRoles,
    consultationController.getPatientHistory,
);

consultationRouter.get(
    "/doctor/:id/patients",
    authMiddleware,
    consultationRoles,
    consultationController.getPatientsMine,
);
