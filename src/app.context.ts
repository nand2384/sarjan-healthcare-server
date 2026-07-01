import { redisClient } from "@cache";
import { prisma } from "@database";
import { logger } from "@logger";

import { AuthService, AuthRepository } from "@modules/auth";
import { SessionRepository, SessionService } from "@modules/session";
import { HealthService } from "@modules/health";

const sessionRepository = new SessionRepository(prisma);
const sessionService = new SessionService(sessionRepository, redisClient);

const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository, sessionService);

const healthService = new HealthService();

export const appContext = Object.freeze({
    logger,
    prisma,
    redisClient,

    services: {
        authService,
        healthService,
        sessionService,
    },
});
