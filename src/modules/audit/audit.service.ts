import { Prisma } from "@generated/prisma/client";

import { AuditRepository } from "./audit.repository";
import { CreateAuditLogData, GetAuditLogsFilters } from "./audit.types";

export class AuditService {
    constructor(private readonly auditRepository: AuditRepository) {}

    public async log(data: CreateAuditLogData, tx?: Prisma.TransactionClient) {
        return this.auditRepository.create(data, tx);
    }

    public async getAuditLogs(filters: GetAuditLogsFilters, tx?: Prisma.TransactionClient) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;

        const [logs, total] = await Promise.all([
            this.auditRepository.findMany(filters, tx),
            this.auditRepository.count(filters, tx),
        ]);

        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
