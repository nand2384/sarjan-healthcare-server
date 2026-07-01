import { redisClient } from "@cache";
import { disconnectDatabase } from "./database";
import { logger } from "./logger";

export async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received. Shutting down application...`);

    try {
        await disconnectDatabase();
        await redisClient.quit();
        logger.info("Disconnected from database");
        process.exit(0);
    } catch (error) {
        logger.fatal(error, "Error during shutdown");
        process.exit(1);
    }
}
