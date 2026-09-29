import { Request, Response } from "express";
import { ReportService } from "./report.service";
import { AppError, ErrorCode } from "@errors";

export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    public submit = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const userAgent = req.headers["user-agent"]?.slice(0, 300);
        const data = await this.reportService.submit(req.body, staffId, userAgent);

        return res.status(201).json({
            success: true,
            message: "Report submitted successfully",
            data,
        });
    };

    public list = async (req: Request, res: Response) => {
        const { page, limit } = req.query as { page?: string; limit?: string };

        const data = await this.reportService.list(
            page ? Number(page) : 1,
            limit ? Number(limit) : 20,
        );

        return res.status(200).json({
            success: true,
            data,
        });
    };
}
