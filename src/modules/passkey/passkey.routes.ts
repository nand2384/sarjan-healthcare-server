import { Router } from "express";
import { appContext } from "app.context";
import { PasskeyController } from "./passkey.controller";
import { authMiddleware } from "@middleware";

export const passkeyRouter = Router();

const passkeyController = new PasskeyController(appContext.services.passkeyService);

passkeyRouter.post("/register/generate-options", authMiddleware, passkeyController.generateRegistrationOptions);
passkeyRouter.post("/register/verify", authMiddleware, passkeyController.verifyRegistration);

passkeyRouter.post("/login/generate-options", passkeyController.generateAuthenticationOptions);
passkeyRouter.post("/login/verify", passkeyController.verifyAuthentication);

passkeyRouter.get("/list", authMiddleware, passkeyController.getPasskeys);
passkeyRouter.patch("/:id/name", authMiddleware, passkeyController.updatePasskeyName);