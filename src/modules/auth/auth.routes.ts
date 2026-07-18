import { Router } from "express";
import { AuthController } from "./auth.controller";
import { appContext } from "app.context";
import { activationCompleteSchema, activationVerifySchema, changePasswordSchema, loginSchema, resendActivationScham, updateProfileSchema } from "./auth.schema";
import { authMiddleware, roleMiddleware, validate, authRateLimiter } from "@middleware";
import { USER_ROLE } from "common/common.schema";

export const authRouter = Router();

const authController = new AuthController(appContext.services.authService);

authRouter.get("/me", 
    authMiddleware, 
    authController.me.bind(authController)
);

authRouter.post("/login", 
    authRateLimiter,
    validate(loginSchema), 
    authController.login.bind(authController)
);

authRouter.post("/logout", 
    authMiddleware, 
    authController.logout.bind(authController)
);

authRouter.post("/account/activation/verify",
    authRateLimiter,
    validate(activationVerifySchema),
    authController.verifyActivation.bind(authController)
);

authRouter.post("/account/activation/complete",
    authRateLimiter,
    validate(activationCompleteSchema),
    authController.completeActivation.bind(authController)
);

authRouter.post("/account/activation/resend",
    authMiddleware,
    roleMiddleware(USER_ROLE.ADMIN),
    validate(resendActivationScham),
    authController.resendActivation.bind(authController)
);

authRouter.get("/profile",
    authMiddleware,
    authController.getProfileDetail.bind(authController)
);

authRouter.patch("/profile", 
    authMiddleware, 
    validate(updateProfileSchema),
    authController.updateProfile.bind(authController)
);

authRouter.post("/change-password",
    authMiddleware,
    validate(changePasswordSchema),
    authController.changePassword.bind(authController)
);

authRouter.get("/sessions",
    authMiddleware,
    authController.getSessions.bind(authController)
);

authRouter.delete("/sessions/others",
    authMiddleware,
    authController.revokeOtherSessions.bind(authController)
);

authRouter.delete("/sessions/:sessionId",
    authMiddleware,
    authController.revokeSession.bind(authController)
);