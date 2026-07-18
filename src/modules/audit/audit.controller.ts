import { Request, Response } from "express";
import { AuditService } from "./audit.service";
import { GetAuditLogsFilters } from "./audit.types";

export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    public getAuditLogs = async (req: Request, res: Response) => {
        const filters = req.query as unknown as GetAuditLogsFilters;

        const result = await this.auditService.getAuditLogs(filters);

        const mappedData = result.data.map(log => ({
            ...log,
            audit_log_id: log.audit_log_id.toString(),
        }));

        return res.status(200).json({
            success: true,
            data: mappedData,
            pagination: result.pagination,
        })
    }
}