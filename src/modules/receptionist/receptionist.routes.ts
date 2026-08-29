import { Router } from "express";
import { ReceptionistController } from "./receptionist.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { appContext } from "../../app.context";
import { USER_ROLE } from "../../common/common.schema";
import { updateAppointmentStatusSchema, sendForTestsSchema, rescheduleAppointmentSchema } from "./receptionist.schema";
import { checkoutSchema } from "@modules/billing/billing.schema";

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


// Also reachable by a doctor viewing their own queue (self-service dashboard)
// — the controller enforces that a DOCTOR-only caller can only pass their own
// staff_id as :id, so this doesn't let one doctor see another's queue.
receptionistRouter.get(
    "/dashboard/doctor/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    receptionistController.getDoctorDashboardData.bind(receptionistController)
);

receptionistRouter.patch(
    "/appointments/:id/check-in", 
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.checkInPatient.bind(receptionistController)
);

// Also reachable by a doctor starting/completing their own consultation —
// the controller restricts a DOCTOR-only caller to those two transitions on
// their own patients only; front-desk-only transitions (check-in, cancel,
// walk-out, awaiting-payment) still require admin/receptionist.
receptionistRouter.patch(
    "/appointments/:id/status",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    validate(updateAppointmentStatusSchema),
    receptionistController.updateAppointmentStatus.bind(receptionistController)
);

receptionistRouter.patch(
    "/appointments/:id/reschedule",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(rescheduleAppointmentSchema),
    receptionistController.rescheduleAppointment.bind(receptionistController)
);

receptionistRouter.post(
    "/appointments/:id/send-for-tests",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(sendForTestsSchema),
    receptionistController.sendForTests.bind(receptionistController)
);

receptionistRouter.get(
    "/appointments/:id/checkout-info",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.getCheckoutInfo.bind(receptionistController)
);

receptionistRouter.post(
    "/appointments/:id/checkout",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(checkoutSchema),
    receptionistController.checkout.bind(receptionistController)
);

receptionistRouter.get(
    "/appointments/history",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.getAppointmentHistory.bind(receptionistController)
);

receptionistRouter.get(
    "/appointments/history/summary",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.getAppointmentHistorySummary.bind(receptionistController)
);

receptionistRouter.get(
    "/appointments/:id/receipt",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    receptionistController.getReceipt.bind(receptionistController)
);
