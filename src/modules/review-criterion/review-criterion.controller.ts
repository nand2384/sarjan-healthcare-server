import { Request, Response } from "express";
import { ReviewCriterionService } from "./review-criterion.service";

export class ReviewCriterionController {
    constructor(private readonly reviewCriterionService: ReviewCriterionService) {}

    public getAll = async (_req: Request, res: Response) => {
        const criteria = await this.reviewCriterionService.getAll();
        return res.status(200).json({ success: true, data: criteria });
    };

    public create = async (req: Request, res: Response) => {
        const criterion = await this.reviewCriterionService.create(req.body);
        return res.status(201).json({ success: true, message: "Rating criterion created.", data: criterion });
    };

    public update = async (req: Request, res: Response) => {
        const criterion = await this.reviewCriterionService.update(Number(req.params.id), req.body);
        return res.status(200).json({ success: true, message: "Rating criterion updated.", data: criterion });
    };
}
