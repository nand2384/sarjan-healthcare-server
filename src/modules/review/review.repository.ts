import { PrismaClient, ReviewSource } from "@generated/prisma/client";

export interface CreateReviewData {
    appointment_id: number;
    patient_id: number;
    doctor_staff_id: number;
    message?: string;
    is_public: boolean;
    source: ReviewSource;
    ratings: { criterion_id: number; stars: number }[];
}

export interface ReviewFilters {
    page?: number;
    limit?: number;
    is_public?: boolean;
    doctor_id?: number;
    search?: string;
}

const reviewInclude = {
    patient: { select: { patient_id: true, first_name: true, last_name: true } },
    doctor: { select: { staff_id: true, first_name: true, last_name: true } },
    ratings: { include: { criterion: { select: { label: true } } } },
} as const;

export class ReviewRepository {
    constructor(private readonly prisma: PrismaClient) {}

    /** Resolves a public feedback link — appointment + whether it already has a review, for the invite endpoint. */
    public async findAppointmentByToken(token: string) {
        return this.prisma.appointment.findUnique({
            where: { review_token: token },
            include: {
                doctor: { select: { first_name: true, last_name: true } },
                review: { select: { review_id: true } },
            },
        });
    }

    public async createTx(data: CreateReviewData) {
        return this.prisma.$transaction(async (tx) => {
            const review = await tx.review.create({
                data: {
                    appointment_id: data.appointment_id,
                    patient_id: data.patient_id,
                    doctor_staff_id: data.doctor_staff_id,
                    message: data.message,
                    is_public: data.is_public,
                    source: data.source,
                },
            });

            await tx.reviewRating.createMany({
                data: data.ratings.map((r) => ({
                    review_id: review.review_id,
                    criterion_id: r.criterion_id,
                    stars: r.stars,
                })),
            });

            return review;
        });
    }

    private buildWhere(filters: ReviewFilters) {
        const { is_public, doctor_id, search } = filters;
        return {
            ...(is_public !== undefined && { is_public }),
            ...(doctor_id && { doctor_staff_id: doctor_id }),
            ...(search && {
                OR: [
                    { patient: { first_name: { contains: search, mode: "insensitive" as const } } },
                    { patient: { last_name: { contains: search, mode: "insensitive" as const } } },
                    { message: { contains: search, mode: "insensitive" as const } },
                ],
            }),
        };
    }

    public async findMany(filters: ReviewFilters) {
        const { page = 1, limit = 20 } = filters;
        return this.prisma.review.findMany({
            where: this.buildWhere(filters),
            include: reviewInclude,
            orderBy: { submitted_at: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    public async count(filters: ReviewFilters) {
        return this.prisma.review.count({ where: this.buildWhere(filters) });
    }

    public async findById(id: number) {
        return this.prisma.review.findUnique({ where: { review_id: id }, include: reviewInclude });
    }

    public async updateApprovalForDisplay(id: number, approved: boolean) {
        return this.prisma.review.update({ where: { review_id: id }, data: { is_approved_for_display: approved } });
    }

    public async deleteTx(id: number) {
        return this.prisma.$transaction(async (tx) => {
            await tx.reviewRating.deleteMany({ where: { review_id: id } });
            return tx.review.delete({ where: { review_id: id } });
        });
    }

    /**
     * Latest public reviews for the landing page's testimonials section.
     * Requires BOTH the patient's consent (is_public) AND the admin's
     * editorial approval (is_approved_for_display) — patient consent alone
     * is never sufficient, since a consented-but-negative review shouldn't
     * surface just because the patient said it could.
     */
    public async findPublicRecent(limit: number) {
        return this.prisma.review.findMany({
            where: { is_public: true, is_approved_for_display: true, message: { not: null } },
            include: reviewInclude,
            orderBy: { submitted_at: "desc" },
            take: limit,
        });
    }

    /**
     * Given a set of patient IDs currently in the receptionist queue, finds
     * each patient's most recent COMPLETED appointment that has no Review yet
     * — one batched query, not N+1 per queue row.
     */
    public async findPendingReviewByPatientIds(patientIds: number[]) {
        if (patientIds.length === 0) return [];

        return this.prisma.appointment.findMany({
            where: {
                patient_id: { in: patientIds },
                appointment_status_id: 6, // COMPLETED
                review: null,
            },
            select: { appointment_id: true, patient_id: true, review_token: true, appointment_date: true },
            // distinct + orderBy together give exactly one row (the most recent) per patient_id.
            distinct: ["patient_id"],
            orderBy: { appointment_date: "desc" },
        });
    }
}
