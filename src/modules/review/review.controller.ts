import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { ReviewFilters } from "./review.repository";

export class ReviewController {
    constructor(private readonly reviewService: ReviewService) {}

    public getInvite = async (req: Request, res: Response) => {
        const result = await this.reviewService.getInvite(String(req.params.token));
        return res.status(200).json({ success: true, data: result });
    };

    public submit = async (req: Request, res: Response) => {
        const review = await this.reviewService.submit(String(req.params.token), req.body);
        return res.status(201).json({ success: true, message: "Thank you for your feedback!", data: review });
    };

    public list = async (req: Request, res: Response) => {
        const filters = req.query as unknown as ReviewFilters;
        const result = await this.reviewService.getReviews(filters);
        return res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    };

    public updateModeration = async (req: Request, res: Response) => {
        const review = await this.reviewService.updateModerationStatus(Number(req.params.id), req.body.status);
        return res.status(200).json({ success: true, message: "Review updated.", data: review });
    };

    public summary = async (_req: Request, res: Response) => {
        const summary = await this.reviewService.getModerationSummary();
        return res.status(200).json({ success: true, data: summary });
    };

    public remove = async (req: Request, res: Response) => {
        await this.reviewService.delete(Number(req.params.id));
        return res.status(200).json({ success: true, message: "Review deleted." });
    };

    public publicRecent = async (_req: Request, res: Response) => {
        const reviews = await this.reviewService.getPublicRecent();
        return res.status(200).json({ success: true, data: reviews });
    };
}
