import { Request, Response } from "express";

import { HealthService } from "./health.service";

export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    public check = async (_req: Request, res: Response) => {
        const result = await this.healthService.checkHealth();

        return res.status(200).json({
            success: true,
            data: result,
        });
    };

    public jobs = async (_req: Request, res: Response) => {
        const statuses = await this.healthService.getJobStatuses();

        return res.status(200).json({
            success: true,
            data: statuses,
        });
    };

    public jobHistory = async (req: Request, res: Response) => {
        const history = await this.healthService.getJobHistory(String(req.params.jobName));

        return res.status(200).json({
            success: true,
            data: history,
        });
    };

    public version = async (_req: Request, res: Response) => {
        return res.status(200).json({
            success: true,
            data: this.healthService.getVersionInfo(),
        });
    };
}
