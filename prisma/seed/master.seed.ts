import prisma from "../../src/database/prisma";
import { logger } from "../../src/logger";

export async function seedMaster() {
    try {
        logger.info("Seeding database...");

        await prisma.roleMaster.createMany({
            data: [
                {
                    role_name: "admin",
                    description: "System Administrator",
                    display_order: 1,
                },
                {
                    role_name: "doctor",
                    description: "Doctor",
                    display_order: 2,
                },
                {
                    role_name: "receptionist",
                    description: "Receptionist",
                    display_order: 3,
                },
                {
                    role_name: "pharmacist",
                    description: "Pharmacist",
                    display_order: 4,
                },
            ],
            skipDuplicates: true,
        });
        logger.info("Role master seeded.");

        await prisma.mainMaster.upsert({
            where: {
                master_name: "Gender",
            },
            update: {},
            create: {
                master_name: "Gender",
                description: "Gender master values.",
            },
        });

        logger.info("Main master seeded.");

        const genderMaster = await prisma.mainMaster.findUniqueOrThrow({
            where: {
                master_name: "Gender",
            },
        });

        await prisma.valueMaster.createMany({
            data: [
                {
                    master_id: genderMaster.master_id,
                    value_name: "Male",
                    display_order: 1,
                },
                {
                    master_id: genderMaster.master_id,
                    value_name: "Female",
                    display_order: 2,
                },
                {
                    master_id: genderMaster.master_id,
                    value_name: "Other",
                    display_order: 3,
                },
            ],
            skipDuplicates: true,
        });

        logger.info("Value master seeded.");

        logger.info("Database seeded successfully.");
    } catch (error) {
        logger.error("Error while seeding database:");
        logger.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}
