import { Request, Response } from "express";
import { NotificationService } from "./notification.service";
import { AppError, ErrorCode } from "@errors";

export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    public getNotifications = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.notificationService.getNotifications(staffId);
        return res.status(200).json({
            success: true,
            data,
        });
    };

    public markAsRead = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const notificationId = Number(req.params.id);
        if (isNaN(notificationId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid notification ID");
        }

        const data = await this.notificationService.markAsRead(notificationId, staffId);
        return res.status(200).json({
            success: true,
            data,
        });
    };
}
