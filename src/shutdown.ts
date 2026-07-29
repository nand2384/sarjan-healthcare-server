import { redisClient } from "@cache";

import { disconnectDatabase } from "./database";
import { logger } from "./logger";
import { getHttpServer } from "./server.instance";

export async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received. Shutting down application...`);

    try {
        const httpServer = getHttpServer();

        if (httpServer) {
            await new Promise<void>((resolve, reject) => {
                httpServer.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });

            logger.info("HTTP server closed");
        }

        await disconnectDatabase();
        await redisClient.quit();

        logger.info("Disconnected from database");

        process.exit(0);
    } catch (error) {
        logger.fatal(error, "Error during shutdown");
        process.exit(1);
    }
}