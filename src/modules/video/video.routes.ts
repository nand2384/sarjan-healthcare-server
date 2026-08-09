import { Router } from "express";
import { appContext } from "app.context";
import { VideoController } from "./video.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { createVideoSchema, updateVideoSchema } from "./video.schema";
import { USER_ROLE } from "common/common.schema";

export const videoRouter = Router();

const videoController = new VideoController(appContext.services.videoService);

videoRouter.get(
    "/category/:categoryId",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    videoController.getByCategoryId,
);

videoRouter.post(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(createVideoSchema),
    videoController.create,
);

videoRouter.patch(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(updateVideoSchema),
    videoController.update,
);

videoRouter.delete(
    "/:id",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    videoController.delete,
);
