import { AppError, ErrorCode } from "@errors";
import { ReviewCriterionRepository, CreateReviewCriterionData, UpdateReviewCriterionData } from "./review-criterion.repository";

export class ReviewCriterionService {
    constructor(private readonly reviewCriterionRepository: ReviewCriterionRepository) {}

    public async getAll() {
        return this.reviewCriterionRepository.findAll();
    }

    public async getActive() {
        return this.reviewCriterionRepository.findActive();
    }

    public async create(data: CreateReviewCriterionData) {
        return this.reviewCriterionRepository.create(data);
    }

    public async update(id: number, data: UpdateReviewCriterionData) {
        const existing = await this.reviewCriterionRepository.findById(id);
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Review criterion not found");
        }
        return this.reviewCriterionRepository.update(id, data);
    }
}
