import { Router } from "express";
import { ReleaseNoteController } from "./release-note.controller";
import { authMiddleware, roleMiddleware, validate } from "@middleware";
import { createReleaseNoteSchema, getReleaseNotesSchema } from "./release-note.schema";
import { appContext } from "app.context";
import { USER_ROLE } from "common/common.schema";

export const releaseNoteRouter = Router();

const releaseNoteController = new ReleaseNoteController(appContext.services.releaseNoteService);

releaseNoteRouter.get(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    validate(getReleaseNotesSchema, "query"),
    releaseNoteController.getReleaseNotes,
);

releaseNoteRouter.post(
    "/",
    authMiddleware,
    roleMiddleware(USER_ROLE.DEVELOPER),
    validate(createReleaseNoteSchema),
    releaseNoteController.create,
);
