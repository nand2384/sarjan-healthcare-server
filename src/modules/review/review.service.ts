import { AppError, ErrorCode } from "@errors";
import { ReviewSource, ReviewModerationStatus } from "@generated/prisma/client";
import { ReviewRepository, ReviewFilters } from "./review.repository";
import { ReviewCriterionService } from "@modules/review-criterion/review-criterion.service";
import { SystemSettingService } from "@modules/system-setting/system-setting.service";
import { SystemSettingKey } from "constants/system-setting.constants";
import { StaffRepository } from "@modules/staff/staff.repository";
import { NotificationService } from "@modules/notification/notification.service";
import { WebSocketPublisher } from "websocket";
import { logger } from "@logger";

export interface SubmitReviewData {
    message?: string;
    is_public: boolean;
    source: ReviewSource;
    ratings: { criterion_id: number; stars: number }[];
}

export class ReviewService {
    constructor(
        private readonly reviewRepository: ReviewRepository,
        private readonly reviewCriterionService: ReviewCriterionService,
        private readonly systemSettingService: SystemSettingService,
        private readonly staffRepository: StaffRepository,
        private readonly notificationService: NotificationService,
    ) {}

    public async getInvite(token: string) {
        const appointment = await this.reviewRepository.findAppointmentByToken(token);
        if (!appointment) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "This feedback link is invalid.");
        }

        if (appointment.review) {
            return { status: "already_submitted" as const };
        }

        if (appointment.appointment_status_id !== 6) {
            return { status: "not_completed" as const };
        }

        const criteria = await this.reviewCriterionService.getActive();

        return {
            status: "ready" as const,
            doctorName: `Dr. ${appointment.doctor.first_name} ${appointment.doctor.last_name}`,
            appointmentDate: appointment.appointment_date,
            criteria: criteria.map((c) => ({ criterion_id: c.criterion_id, label: c.label, description: c.description })),
        };
    }

    public async submit(token: string, data: SubmitReviewData) {
        const appointment = await this.reviewRepository.findAppointmentByToken(token);
        if (!appointment) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "This feedback link is invalid.");
        }
        if (appointment.review) {
            throw new AppError(409, ErrorCode.CONFLICT, "Feedback has already been submitted for this visit.");
        }
        if (appointment.appointment_status_id !== 6) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "This appointment isn't complete yet.");
        }

        const activeCriteria = await this.reviewCriterionService.getActive();
        const activeCriterionIds = new Set(activeCriteria.map((c) => c.criterion_id));

        if (data.ratings.length === 0) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "At least one rating is required.");
        }
        for (const rating of data.ratings) {
            if (!activeCriterionIds.has(rating.criterion_id)) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "One of the rating criteria is no longer available.");
            }
            if (rating.stars < 1 || rating.stars > 5) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "Ratings must be between 1 and 5 stars.");
            }
        }

        const review = await this.reviewRepository.createTx({
            appointment_id: appointment.appointment_id,
            patient_id: appointment.patient_id,
            doctor_staff_id: appointment.doctor_staff_id,
            message: data.message,
            is_public: data.is_public,
            source: data.source,
            ratings: data.ratings,
        });

        // No staff member triggered this — it's patient-initiated — so there's
        // no sender to exclude from the broadcast. Reuses the same event the
        // receptionist dashboard already listens to for queue changes, so an
        // open dashboard/drawer drops the "feedback pending" badge live
        // instead of only on the next unrelated refetch.
        WebSocketPublisher.queueUpdated({ appointmentId: appointment.appointment_id }, -1, appointment.doctor_staff_id);

        // Only consented reviews ever enter the moderation queue — nothing to
        // approve for one the patient declined to make public, so no point
        // paging admins about it.
        if (data.is_public) {
            void this.notifyAdminsOfPendingReview(appointment.patient);
        }

        return review;
    }

    /** Never throws — a notification hiccup must not fail the patient's submission. */
    private async notifyAdminsOfPendingReview(patient: { first_name: string; last_name: string } | null): Promise<void> {
        try {
            const adminIds = await this.staffRepository.getActiveAdminIds();
            const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "A patient";

            await Promise.all(
                adminIds.map((adminId) =>
                    this.notificationService.notify(adminId, {
                        title: "New review pending approval",
                        message: `${patientName} submitted a review awaiting your approval.`,
                        type: "INFO",
                        action_url: "/admin/patient-reviews",
                    }),
                ),
            );
        } catch (error) {
            logger.error({ err: error }, "Failed to notify admins of new pending review");
        }
    }

    public async getReviews(filters: ReviewFilters) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const [rows, total] = await Promise.all([
            this.reviewRepository.findMany({ ...filters, page, limit }),
            this.reviewRepository.count(filters),
        ]);
        return { data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    public async updateModerationStatus(id: number, status: ReviewModerationStatus) {
        const existing = await this.reviewRepository.findById(id);
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Review not found");
        }
        // The patient's consent is a hard gate, not just a default — admin can
        // never publish a review the patient didn't agree to make public,
        // however positive it is.
        if (status === "APPROVED" && !existing.is_public) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "This patient didn't consent to their review being shown publicly.");
        }
        return this.reviewRepository.updateModerationStatus(id, status);
    }

    /** KPI counts + average rating for the admin Patient Reviews page header. */
    public async getModerationSummary() {
        return this.reviewRepository.getModerationSummary();
    }

    public async delete(id: number) {
        const existing = await this.reviewRepository.findById(id);
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Review not found");
        }
        return this.reviewRepository.deleteTx(id);
    }

    public async getPublicRecent() {
        const limit = await this.systemSettingService.getNumber(SystemSettingKey.PUBLIC_REVIEWS_DISPLAY_LIMIT);
        const reviews = await this.reviewRepository.findPublicRecent(limit);
        return reviews.map((review) => {
            const avg = review.ratings.length > 0
                ? Math.round(review.ratings.reduce((sum, r) => sum + r.stars, 0) / review.ratings.length)
                : 0;
            const lastInitial = review.patient.last_name ? `${review.patient.last_name[0]}.` : "";
            return {
                name: `${review.patient.first_name} ${lastInitial}`.trim(),
                review: review.message ?? "",
                rating: avg,
                date: review.submitted_at.toISOString(),
            };
        });
    }

    /** For the receptionist dashboard mapper — patient_id -> their pending-review appointment, if any. */
    public async getPendingReviewMap(patientIds: number[]): Promise<Map<number, { appointment_id: number; review_token: string }>> {
        const rows = await this.reviewRepository.findPendingReviewByPatientIds(patientIds);
        return new Map(rows.map((r) => [r.patient_id, { appointment_id: r.appointment_id, review_token: r.review_token }]));
    }
}
