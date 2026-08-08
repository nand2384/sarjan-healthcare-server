import prisma from "../../src/database/prisma";
import { logger } from "../../src/logger";

const DEFAULT_CRITERIA = [
    { label: "Doctor Care", description: "How well the doctor listened and addressed your concerns.", display_order: 1 },
    { label: "Wait Time", description: "How reasonable the wait was before your consultation.", display_order: 2 },
    { label: "Staff Friendliness", description: "How helpful and courteous the front-desk/nursing staff were.", display_order: 3 },
    { label: "Cleanliness", description: "How clean and well-maintained the facility was.", display_order: 4 },
    { label: "Overall Experience", description: "Your overall impression of the visit.", display_order: 5 },
];

export async function seedReviewCriteria() {
    // No natural unique key on label to skipDuplicates against — instead,
    // only seed defaults the very first time (empty table), so re-running
    // the seed script doesn't clobber criteria an admin has since edited.
    const existingCount = await prisma.reviewCriterion.count();
    if (existingCount > 0) {
        logger.info("Review criteria already seeded, skipping.");
        return;
    }

    await prisma.reviewCriterion.createMany({ data: DEFAULT_CRITERIA });
    logger.info("Review criteria seeded.");
}
