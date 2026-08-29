import { Router } from "express";
import { appContext } from "../../app.context";
import { DoctorController } from "./doctor.controller";
import { validate } from "@middleware";
import { createDoctorSchema, updateDoctorSchema, updateDoctorLevelSchema, doctorAvailabilitySlotSchema, doctorLeaveSchema } from "./doctor.schema";
import { authMiddleware, roleMiddleware, singleImageUpload } from "@middleware";
import { USER_ROLE } from "common/common.schema";

export const doctorRouter = Router();

const doctorController = new DoctorController(appContext.services.doctorService);

// Was unauthenticated until this change — returned the full internal
// Staff+DoctorProfile record (email, mobile, fees, registration number) to
// anyone. Same access pattern as the sibling /doctors/basic route below.
doctorRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    doctorController.getAllDoctors,
);

// Also reachable by DOCTOR/LEAD_DOCTOR — only name + specialization, needed
// to populate the "refer to another doctor" picker in the consultation flow.
doctorRouter.get("/basic",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    doctorController.getBasicDoctors.bind(doctorController)
);

// Was unauthenticated until this change — same leak as GET "/" above.
doctorRouter.get(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    doctorController.getDoctorById,
);

doctorRouter.post(
    "/create",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createDoctorSchema),
    doctorController.createDoctor.bind(doctorController)
);

// Photo management — decoupled from doctor creation/editing, its own admin
// surface. "type" is "card" (Doctors grid headshot) or "pose" (hero carousel
// transparent cutout), validated in the controller.
doctorRouter.post(
    "/:id/photos/:type",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    singleImageUpload("photo"),
    doctorController.uploadDoctorPhoto,
);

doctorRouter.delete(
    "/:id/photos/:type",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    doctorController.deleteDoctorPhoto,
);

doctorRouter.patch(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(updateDoctorSchema),
    doctorController.updateDoctor.bind(doctorController)
);

doctorRouter.patch(
    "/:id/level",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(updateDoctorLevelSchema),
    doctorController.updateDoctorLevel.bind(doctorController)
);

doctorRouter.get(
    "/:id/availability",
    authMiddleware,
    doctorController.getDoctorAvailability.bind(doctorController)
);

doctorRouter.get(
    "/:id/effective-schedule",
    authMiddleware,
    doctorController.getEffectiveSchedule.bind(doctorController)
);

doctorRouter.post(
    "/:id/availability",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(doctorAvailabilitySlotSchema),
    doctorController.createDoctorAvailability.bind(doctorController)
);

doctorRouter.put(
    "/:id/availability/:slotId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(doctorAvailabilitySlotSchema),
    doctorController.updateDoctorAvailability.bind(doctorController)
);

doctorRouter.delete(
    "/:id/availability/:slotId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    doctorController.deleteDoctorAvailability.bind(doctorController)
);

// Doctor Leave Management
doctorRouter.get(
    "/:id/leaves",
    authMiddleware,
    doctorController.getDoctorLeaves.bind(doctorController)
);

doctorRouter.post(
    "/:id/leaves",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(doctorLeaveSchema),
    doctorController.createDoctorLeave.bind(doctorController)
);

doctorRouter.put(
    "/:id/leaves/:leaveId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    validate(doctorLeaveSchema),
    doctorController.updateDoctorLeave.bind(doctorController)
);

doctorRouter.delete(
    "/:id/leaves/:leaveId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.RECEPTIONIST),
    doctorController.deleteDoctorLeave.bind(doctorController)
);
