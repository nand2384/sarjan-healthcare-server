import prisma from "./prisma";
import { logger } from "@logger";

export async function connectDatabase(): Promise<void> {
    try {
        await prisma.$connect();
        logger.info("Connected to database successfully");
    } catch (error) {
        logger.fatal(error, "Failed to connect to database");
        process.exit(1);
    }
}

export async function disconnectDatabase(): Promise<void> {
    try {
        await prisma.$disconnect();
        logger.info("Disconnected from database");
    } catch (error) {
        logger.error(error, "Failed to disconnect from database");
    }
}
