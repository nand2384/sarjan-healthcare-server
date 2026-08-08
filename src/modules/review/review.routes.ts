import { Router } from "express";
import { appContext } from "app.context";
import { ReviewController } from "./review.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { submitReviewSchema, getReviewsSchema, updateReviewModerationSchema } from "./review.schema";
import { USER_ROLE } from "common/common.schema";

const reviewController = new ReviewController(appContext.services.reviewService);

// Public — no auth at all (a patient's own phone, not a staff session). Same
// "standalone, no guard" precedent as the account-activation routes.
export const reviewRouter = Router();

reviewRouter.get("/invite/:token", reviewController.getInvite);
reviewRouter.post("/invite/:token", validate(submitReviewSchema), reviewController.submit);

// Admin moderation. /summary registered before the generic "/:id" routes so
// this literal segment isn't swallowed as id="summary".
reviewRouter.get("/summary", authMiddleware, roleMiddleware(USER_ROLE.ADMIN), reviewController.summary);
reviewRouter.get("/", authMiddleware, roleMiddleware(USER_ROLE.ADMIN), validate(getReviewsSchema, "query"), reviewController.list);
reviewRouter.patch("/:id", authMiddleware, roleMiddleware(USER_ROLE.ADMIN), validate(updateReviewModerationSchema), reviewController.updateModeration);
reviewRouter.delete("/:id", authMiddleware, roleMiddleware(USER_ROLE.ADMIN), reviewController.remove);

// Mounted separately at /public — feeds the landing page's ReviewsSection.
export const publicReviewRouter = Router();
publicReviewRouter.get("/reviews", reviewController.publicRecent);
