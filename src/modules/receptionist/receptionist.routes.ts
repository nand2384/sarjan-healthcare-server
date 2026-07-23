import { Router } from "express";
import { ReceptionistController } from "./receptionist.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { appContext } from "../../app.context";
import { USER_ROLE } from "../../common/common.schema";
import { updateAppointmentStatusSchema } from "./receptionist.schema";

export const receptionistRouter = Router();

const receptionistController = new ReceptionistController(appContext.services.receptionistService);

receptionistRouter.get(
    "/appointments", 
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.getAllAppointments.bind(receptionistController)
);

receptionistRouter.get(
    "/dashboard", 
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.getDashboardData.bind(receptionistController)
);


receptionistRouter.get(
    "/dashboard/doctor/:id", 
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.getDoctorDashboardData.bind(receptionistController)
);

receptionistRouter.patch(
    "/appointments/:id/check-in", 
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.checkInPatient.bind(receptionistController)
);

receptionistRouter.patch(
    "/appointments/:id/status", 
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(updateAppointmentStatusSchema),
    receptionistController.updateAppointmentStatus.bind(receptionistController)
);
