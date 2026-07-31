import { Request, Response } from "express";
import { AnnouncementService } from "./announcement.service";
import { AppError, ErrorCode } from "@errors";

export class AnnouncementController {
    constructor(private readonly announcementService: AnnouncementService) {}

    public create = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.announcementService.publish(req.body, staffId);

        return res.status(201).json({
            success: true,
            message: "Announcement published successfully",
            data,
        });
    };

    public list = async (req: Request, res: Response) => {
        const { page, limit } = req.query;

        const data = await this.announcementService.list(
            page ? Number(page) : 1,
            limit ? Number(limit) : 20,
        );

        return res.status(200).json({
            success: true,
            data,
        });
    };

    public withdraw = async (req: Request, res: Response) => {
        const announcementId = Number(req.params.id);
        if (isNaN(announcementId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid announcement ID");
        }

        const data = await this.announcementService.withdraw(announcementId);

        return res.status(200).json({
            success: true,
            data,
        });
    };
}
