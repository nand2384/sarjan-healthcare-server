import { Router } from "express";
import { appContext } from "app.context";
import { VideoCategoryController } from "./video-category.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { createVideoCategorySchema, updateVideoCategorySchema } from "./video-category.schema";
import { USER_ROLE } from "common/common.schema";

export const videoCategoryRouter = Router();

const videoCategoryController = new VideoCategoryController(appContext.services.videoCategoryService);

videoCategoryRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    videoCategoryController.getAll,
);

videoCategoryRouter.post(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createVideoCategorySchema),
    videoCategoryController.create,
);

videoCategoryRouter.patch(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(updateVideoCategorySchema),
    videoCategoryController.update,
);
