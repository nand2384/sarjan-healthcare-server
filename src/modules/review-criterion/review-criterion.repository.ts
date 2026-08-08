import { PrismaClient } from "@generated/prisma/client";

export interface CreateReviewCriterionData {
    label: string;
    description?: string;
    display_order?: number;
}

export interface UpdateReviewCriterionData {
    label?: string;
    description?: string | null;
    display_order?: number;
    is_active?: boolean;
}

export class ReviewCriterionRepository {
    constructor(private readonly prisma: PrismaClient) {}

    /** All criteria, active and inactive — the admin management list needs to see both. */
    public async findAll() {
        return this.prisma.reviewCriterion.findMany({
            orderBy: [{ display_order: "asc" }, { criterion_id: "asc" }],
        });
    }

    /** Active only, ordered for display — what the public feedback form and the receptionist QR flow use. */
    public async findActive() {
        return this.prisma.reviewCriterion.findMany({
            where: { is_active: true },
            orderBy: [{ display_order: "asc" }, { criterion_id: "asc" }],
        });
    }

    public async findById(id: number) {
        return this.prisma.reviewCriterion.findUnique({ where: { criterion_id: id } });
    }

    public async create(data: CreateReviewCriterionData) {
        return this.prisma.reviewCriterion.create({ data });
    }

    public async update(id: number, data: UpdateReviewCriterionData) {
        return this.prisma.reviewCriterion.update({ where: { criterion_id: id }, data });
    }
}
