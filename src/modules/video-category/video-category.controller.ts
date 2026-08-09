import { Request, Response } from "express";
import { VideoCategoryService } from "./video-category.service";

export class VideoCategoryController {
    constructor(private readonly videoCategoryService: VideoCategoryService) {}

    public getAll = async (_req: Request, res: Response) => {
        const categories = await this.videoCategoryService.getAll();
        return res.status(200).json({ success: true, data: categories });
    };

    public create = async (req: Request, res: Response) => {
        const category = await this.videoCategoryService.create(req.body);
        return res.status(201).json({ success: true, message: "Video category created.", data: category });
    };

    public update = async (req: Request, res: Response) => {
        const category = await this.videoCategoryService.update(Number(req.params.id), req.body);
        return res.status(200).json({ success: true, message: "Video category updated.", data: category });
    };
}
