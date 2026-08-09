import { Request, Response } from "express";
import { VideoService } from "./video.service";

export class VideoController {
    constructor(private readonly videoService: VideoService) {}

    public getByCategoryId = async (req: Request, res: Response) => {
        const categoryId = Number(req.params.categoryId);
        const videos = await this.videoService.getByCategoryId(categoryId);
        return res.status(200).json({ success: true, data: videos });
    };

    public create = async (req: Request, res: Response) => {
        const video = await this.videoService.create(req.body);
        return res.status(201).json({ success: true, message: "Video added.", data: video });
    };

    public update = async (req: Request, res: Response) => {
        const video = await this.videoService.update(Number(req.params.id), req.body);
        return res.status(200).json({ success: true, message: "Video updated.", data: video });
    };

    public delete = async (req: Request, res: Response) => {
        await this.videoService.delete(Number(req.params.id));
        return res.status(200).json({ success: true, message: "Video deleted." });
    };
}
