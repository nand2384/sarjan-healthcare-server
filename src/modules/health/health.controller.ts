import { Request, Response } from "express";

import { HealthService } from "./health.service";

export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    public async check(_req: Request, res: Response) {
        await this.healthService.checkHealth();

        return res.status(200).json({
            success: true,
            message: "Server is healthy.",
        });
    }
}
