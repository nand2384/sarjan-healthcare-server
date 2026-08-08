import { Router } from "express";

import { authRouter } from "@modules/auth/auth.routes";
import { auditRouter } from "@modules/audit/audit.routes";
import { healthRouter } from "@modules/health/health.routes";
import { staffRouter } from "@modules/staff/staff.routes";
import { masterRouter } from "@modules/master/master.routes";
import { doctorRouter } from "@modules/doctor/doctor.routes";
import { receptionistRouter } from "@modules/receptionist/receptionist.routes";
import { notificationRouter } from "@modules/notification/notification.routes";
import { billingRouter } from "@modules/billing/billing.routes";
import { financeRouter } from "@modules/finance/finance.routes";
import { announcementRouter } from "@modules/announcement/announcement.routes";
import { systemSettingRouter } from "@modules/system-setting/system-setting.routes";
import { reportRouter } from "@modules/report/report.routes";
import { queueRouter } from "@modules/queue/queue.routes";
import { errorLogRouter } from "@modules/error-log/error-log.routes";
import { sessionRouter } from "@modules/session/session.routes";
import { deliveryLogRouter } from "@modules/delivery-log/delivery-log.routes";
import { releaseNoteRouter } from "@modules/release-note/release-note.routes";
import { reviewCriterionRouter } from "@modules/review-criterion/review-criterion.routes";
import { reviewRouter, publicReviewRouter } from "@modules/review/review.routes";

// Remove on removing redis/clear API
import { env } from "@config";
import { AppError, ErrorCode } from "@errors";
import { redisClient } from "@cache";
import { appContext } from "app.context";
import { passkeyRouter } from "@modules/passkey/passkey.routes";
import { patientRouter } from "@modules/patient/patient.routes";

const router = Router();

router.use("/health", healthRouter);
router.use("/audit", auditRouter);
router.use("/master", masterRouter);
router.use("/auth", authRouter);
router.use("/passkey", passkeyRouter);
router.use("/staff", staffRouter);
router.use("/doctors", doctorRouter);
router.use("/patients", patientRouter);
router.use("/receptionist", receptionistRouter);
router.use("/notifications", notificationRouter);
router.use("/billing", billingRouter);
router.use("/admin/finance", financeRouter);
router.use("/announcements", announcementRouter);
router.use("/system-settings", systemSettingRouter);
router.use("/reports", reportRouter);
router.use("/queue", queueRouter);
router.use("/error-logs", errorLogRouter);
router.use("/session", sessionRouter);
router.use("/delivery-logs", deliveryLogRouter);
router.use("/release-notes", releaseNoteRouter);
router.use("/review-criteria", reviewCriterionRouter);
router.use("/reviews", reviewRouter);
router.use("/public", publicReviewRouter);

router.get("/dev/redis/clear", async (_req, res, next) => {
    try {
        if (env.NODE_ENV !== "development") {
            throw new AppError(
                404,
                ErrorCode.NOT_FOUND,
                "Not found.",
            );
        }

        await redisClient.flushDb();

        return res.status(200).json({
            message: "Redis cache cleared successfully.",
        });
    } catch (error) {
        next(error);
    }
});

router.post("/dev/send/activation-mail", async (req, res, next) => {
    try {
        if(env.NODE_ENV !== "development") {
            throw new AppError(
                404,
                ErrorCode.NOT_FOUND,
                "Not found.",
            );
        }

        const toEmail = req.body.email;
        
        await appContext.services.mailerService.sendStaffActivationMail({
            to: toEmail,
            firstName: "first name",
            username: "username",
            activationLink: "http://localhost:5173",
        })
        
        return res.status(200).json({
            message: "Mail sent",
        });
    } catch (error) {
        next(error);
    }
})

export default router;
