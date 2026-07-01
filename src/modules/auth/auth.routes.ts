import { Router } from "express";
import { AuthController } from "./auth.controller";
import { appContext } from "app.context";
import { loginSchema } from "./auth.schema";
import { authMiddleware, roleMiddleware, validate } from "@middleware";

export const authRouter = Router();

const authController = new AuthController(appContext.services.authService);

authRouter.get("/me", authMiddleware, authController.me.bind(authController));

authRouter.post("/login", validate(loginSchema), authController.login.bind(authController));
authRouter.post("/logout", authMiddleware, authController.logout.bind(authController));
