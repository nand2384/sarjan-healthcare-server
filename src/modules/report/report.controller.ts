import { Request, Response } from "express";
import { ReportService } from "./report.service";
import { AppError, ErrorCode } from "@errors";
import { USER_ROLE } from "common/common.schema";

function isDeveloper(req: Request): boolean {
    return (req.session?.roles ?? []).includes(USER_ROLE.DEVELOPER);
}

export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    public submit = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.reportService.submit(req.body, staffId);

        return res.status(201).json({
            success: true,
            message: "Report submitted successfully",
            data,
        });
    };

    public list = async (req: Request, res: Response) => {
        const { page, limit, status, report_type } = req.query as {
            page?: string;
            limit?: string;
            status?: any;
            report_type?: any;
        };

        const data = await this.reportService.list(
            page ? Number(page) : 1,
            limit ? Number(limit) : 20,
            { status, report_type },
        );

        return res.status(200).json({
            success: true,
            data,
        });
    };

    public statusCounts = async (_req: Request, res: Response) => {
        const data = await this.reportService.getStatusCounts();

        return res.status(200).json({
            success: true,
            data,
        });
    };

    public updateStatus = async (req: Request, res: Response) => {
        const reportId = Number(req.params.id);
        if (isNaN(reportId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid report ID");
        }

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.reportService.updateStatus(reportId, req.body, staffId);

        return res.status(200).json({
            success: true,
            data,
        });
    };

    public listMine = async (req: Request, res: Response) => {
        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.reportService.listMine(staffId);

        return res.status(200).json({
            success: true,
            data,
        });
    };

    public getDetail = async (req: Request, res: Response) => {
        const reportId = Number(req.params.id);
        if (isNaN(reportId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid report ID");
        }

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.reportService.getReportDetail(reportId, staffId, isDeveloper(req));

        return res.status(200).json({
            success: true,
            data,
        });
    };

    public postMessage = async (req: Request, res: Response) => {
        const reportId = Number(req.params.id);
        if (isNaN(reportId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid report ID");
        }

        const staffId = req.session?.staff_id;
        if (!staffId) {
            throw new AppError(401, ErrorCode.UNAUTHORIZED, "User not authenticated");
        }

        const data = await this.reportService.postMessage(reportId, staffId, isDeveloper(req), req.body.message);

        return res.status(201).json({
            success: true,
            data,
        });
    };
}
