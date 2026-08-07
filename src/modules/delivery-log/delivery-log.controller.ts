import { Request, Response } from "express";
import { EventLogService } from "@modules/event-log/event-log.service";

export class DeliveryLogController {
    constructor(private readonly eventLogService: EventLogService) {}

    public getDeliveryLogs = async (req: Request, res: Response) => {
        const filters = req.query as unknown as { page?: number; limit?: number; channel?: "EMAIL" | "WHATSAPP" };
        const result = await this.eventLogService.getDeliveryLogs(filters);

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    };
}
