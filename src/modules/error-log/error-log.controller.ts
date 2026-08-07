import { Request, Response } from "express";
import { EventLogService } from "@modules/event-log/event-log.service";

export class ErrorLogController {
    constructor(private readonly eventLogService: EventLogService) {}

    public getErrorLogs = async (req: Request, res: Response) => {
        const filters = req.query as unknown as { page?: number; limit?: number };
        const result = await this.eventLogService.getErrorLogs(filters);

        return res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    };
}
