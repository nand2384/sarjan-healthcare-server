import prisma from "../../src/database/prisma";
import { logger } from "../../src/logger";

export async function seedMaster() {
    try {
        logger.info("Seeding database...");

        await prisma.roleMaster.createMany({
            data: [
                {
                    role_name: "Admin",
                    description: "System Administrator",
                    display_order: 1,
                },
                {
                    role_name: "Doctor",
                    description: "Doctor",
                    display_order: 2,
                },
                {
                    role_name: "Receptionist",
                    description: "Receptionist",
                    display_order: 3,
                },
                {
                    role_name: "Pharmacist",
                    description: "Pharmacist",
                    display_order: 4,
                },
                {
                    role_name: "Developer",
                    description: "Developer",
                    display_order: 5,
                },
            ],
            skipDuplicates: true,
        });
        logger.info("Role master seeded.");

        const mainMasters = [
            { name: "Gender", description: "Gender master values." },
            { name: "Appointment Status", description: "Statuses for appointments." },
            { name: "Visit Reason", description: "Reasons for the visit." }
        ];

        for (const master of mainMasters) {
            await prisma.mainMaster.upsert({
                where: { master_name: master.name },
                update: {},
                create: { master_name: master.name, description: master.description },
            });
        };
        logger.info("Main master seeded.");

        const genderMaster = await prisma.mainMaster.findUniqueOrThrow({ where: { master_name: "Gender" } });
        const appointmentStatusMaster = await prisma.mainMaster.findUniqueOrThrow({ where: { master_name: "Appointment Status" } });
        const visitReasonMaster = await prisma.mainMaster.findUniqueOrThrow({ where: { master_name: "Visit Reason" } });

        // 3. Value Masters
        await prisma.valueMaster.createMany({
            data: [
                // Gender
                { value_id: 1, master_id: genderMaster.master_id, value_name: "Male", display_order: 1 },
                { value_id: 2, master_id: genderMaster.master_id, value_name: "Female", display_order: 2 },
                { value_id: 3, master_id: genderMaster.master_id, value_name: "Other", display_order: 3 },

                // Appointment Status
                { value_id: 4, master_id: appointmentStatusMaster.master_id, value_name: "BOOKED", display_order: 1 },
                { value_id: 5, master_id: appointmentStatusMaster.master_id, value_name: "CHECKED_IN", display_order: 2 },
                { value_id: 12, master_id: appointmentStatusMaster.master_id, value_name: "IN_CONSULTATION", display_order: 3 },
                { value_id: 13, master_id: appointmentStatusMaster.master_id, value_name: "WAITING_REPORTS", display_order: 4 },
                { value_id: 14, master_id: appointmentStatusMaster.master_id, value_name: "AWAITING_PAYMENT", display_order: 5 },
                { value_id: 6, master_id: appointmentStatusMaster.master_id, value_name: "COMPLETED", display_order: 6 },
                { value_id: 7, master_id: appointmentStatusMaster.master_id, value_name: "CANCELLED", display_order: 7 },
                { value_id: 15, master_id: appointmentStatusMaster.master_id, value_name: "WALKED_OUT", display_order: 8 },

                // Visit Reason (Matching frontend dropdown options)
                { value_id: 8, master_id: visitReasonMaster.master_id, value_name: "General Checkup", display_order: 1 },
                { value_id: 9, master_id: visitReasonMaster.master_id, value_name: "2nd Opinion", display_order: 2 },
                { value_id: 10, master_id: visitReasonMaster.master_id, value_name: "Tests / Reports", display_order: 3 },
                { value_id: 11, master_id: visitReasonMaster.master_id, value_name: "Other", display_order: 4 },
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
