import prisma from "../src/database/prisma";
import { logger } from "../src/logger";
import { seedAuth } from "./seed/auth.seed";
import { seedMaster } from "./seed/master.seed";
import { seedReviewCriteria } from "./seed/review-criteria.seed";

async function seed() {
    try {
        logger.info("Seeding database...");

        await seedMaster();
        await seedAuth();
        await seedReviewCriteria();

        logger.info("Database seeded successfully.");
    } catch (error) {
        logger.error("Error while seeding database.");
        logger.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
