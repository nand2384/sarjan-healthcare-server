import { Router } from "express";
import { appContext } from "app.context";
import { ReferralController } from "./referral.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { createReferralSchema } from "./referral.schema";
import { USER_ROLE } from "common/common.schema";

export const referralRouter = Router();

const referralController = new ReferralController(appContext.services.referralService);

referralRouter.post(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    validate(createReferralSchema),
    referralController.createReferral,
);

referralRouter.delete(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    referralController.revokeReferral,
);

referralRouter.get(
    "/patient/:patientId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN, USER_ROLE.DOCTOR, USER_ROLE.LEAD_DOCTOR),
    referralController.getPatientReferrals,
);
