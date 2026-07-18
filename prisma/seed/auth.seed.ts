import bcrypt from "bcrypt";
import prisma from "../../src/database/prisma";
import { env } from "../../src/config/env";
import { logger } from "../../src/logger";

export async function seedAuth() {
    logger.info("Seeding authentication module...");

    const [adminRole, gender] = await Promise.all([
        prisma.roleMaster.findUniqueOrThrow({
            where: {
                role_name: "admin",
            },
        }),

        prisma.valueMaster.findFirstOrThrow({
            where: {
                value_name: "Male",
                main_master: {
                    master_name: "Gender",
                },
            },
        }),
    ]);

    const passwordHash = await bcrypt.hash(env.DEFAULT_ADMIN_PASSWORD, 12);

    const bootstrapAdmin = await prisma.staff.upsert({
        where: {
            username: env.DEFAULT_ADMIN_USERNAME,
        },
        update: {},
        create: {
            first_name: "Bootstrap",
            last_name: "Administrator",

            username: env.DEFAULT_ADMIN_USERNAME,

            mobile_number: String(env.DEFAULT_ADMIN_MOBILE_NUMBER),
            email: env.DEFAULT_ADMIN_EMAIL,

            password_hash: passwordHash,

            gender_id: gender.value_id,

            is_system_account: true,
            is_disabled: false,
            is_account_activated: true,
        },
    });

    await prisma.staffRole.upsert({
        where: {
            staff_id_role_id: {
                staff_id: bootstrapAdmin.staff_id,
                role_id: adminRole.role_id,
            },
        },
        update: {},
        create: {
            staff_id: bootstrapAdmin.staff_id,
            role_id: adminRole.role_id,
            is_default: true,
        },
    });

    logger.info("Authentication module seeded.");
}
