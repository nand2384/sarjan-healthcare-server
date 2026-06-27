import { prisma } from "./database";
import { logger } from "./logger";

export const appContext = {
    logger,
    prisma,
};

Object.freeze(appContext);
