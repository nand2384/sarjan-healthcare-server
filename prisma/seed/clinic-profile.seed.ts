import prisma from "../../src/database/prisma";
import { logger } from "../../src/logger";

// Seeds the singleton row (id 1) with the values the landing page's mock
// data used to hardcode, so the public endpoint is never empty post-migration
// and there's sensible content for the admin to edit rather than blanks.
const DEFAULT_PROFILE = {
    address: "303-304, Aagam Business Park, Station Rd, Kapadia Chal, Valsad, Gujarat 396001",
    phone: "+91 97277 23328",
    email: "sample@email.com",
    timings: "9:00 AM - 8:00 PM",
    days_open: "Mon - Sat",
    about_description:
        "Sarjan Healthcare is a multispecialty hospital offering expert interventional cardiology, advanced laser treatments for piles and fissures, and comprehensive maternity and nursing care.",
};

export async function seedClinicProfile() {
    const existingCount = await prisma.clinicProfile.count();
    if (existingCount > 0) {
        logger.info("Clinic profile already seeded, skipping.");
        return;
    }

    // Explicit id: 1 — the repository always reads/writes clinic_profile_id 1
    // as the singleton row; don't rely on autoincrement happening to start there.
    await prisma.clinicProfile.create({ data: { clinic_profile_id: 1, ...DEFAULT_PROFILE } });
    logger.info("Clinic profile seeded.");
}
