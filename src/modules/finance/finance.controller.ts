import { Request, Response } from "express";
import { AppError, ErrorCode } from "@errors";
import { FinanceService } from "./finance.service";

export class FinanceController {
    constructor(private readonly financeService: FinanceService) {}

    public getSummary = async (req: Request, res: Response) => {
        const { start, end } = req.query;

        if (!start || !end || typeof start !== "string" || typeof end !== "string") {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "start and end date query parameters are required (YYYY-MM-DD).");
        }

        const startDate = new Date(`${start}T00:00:00`);
        const endDate = new Date(`${end}T23:59:59.999`);

        const data = await this.financeService.getSummary(startDate, endDate);

        return res.status(200).json({
            message: "Fetched finance summary successfully.",
            data,
        });
    };

    public getDoctorPayments = async (req: Request, res: Response) => {
        const staffId = parseInt(req.params.staffId as string);
        if (isNaN(staffId)) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "Invalid doctor staff ID");
        }

        const { start, end } = req.query;
        if (!start || !end || typeof start !== "string" || typeof end !== "string") {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "start and end date query parameters are required (YYYY-MM-DD).");
        }

        const startDate = new Date(`${start}T00:00:00`);
        const endDate = new Date(`${end}T23:59:59.999`);

        const data = await this.financeService.getDoctorPayments(staffId, startDate, endDate);

        return res.status(200).json({
            message: "Fetched doctor payments successfully.",
            data,
        });
    };
}
