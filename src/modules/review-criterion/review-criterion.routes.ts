import { Router } from "express";
import { appContext } from "app.context";
import { ReviewCriterionController } from "./review-criterion.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { createReviewCriterionSchema, updateReviewCriterionSchema } from "./review-criterion.schema";
import { USER_ROLE } from "common/common.schema";

export const reviewCriterionRouter = Router();

const reviewCriterionController = new ReviewCriterionController(appContext.services.reviewCriterionService);

reviewCriterionRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    reviewCriterionController.getAll,
);

reviewCriterionRouter.post(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createReviewCriterionSchema),
    reviewCriterionController.create,
);

reviewCriterionRouter.patch(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(updateReviewCriterionSchema),
    reviewCriterionController.update,
);
