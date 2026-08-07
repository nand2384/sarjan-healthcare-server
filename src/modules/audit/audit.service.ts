import { AuditEntityType, Prisma } from "@generated/prisma/client";

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
            data: await this.attachTargetStaff(logs, tx),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * `entity_id` is a generic string (works across STAFF/DOCTOR/PATIENT/etc.),
     * not a typed relation, so it can't be resolved via a Prisma `include`.
     * For STAFF-entity rows specifically — the account an action was performed
     * on/against, e.g. FAILED_LOGIN_ATTEMPT/ACCOUNT_LOCKED — this batch-resolves
     * that raw id into a name, so the UI isn't stuck showing "Staff #4".
     */
    private async attachTargetStaff<T extends { entity_type: AuditEntityType; entity_id: string }>(
        logs: T[],
        tx?: Prisma.TransactionClient,
    ) {
        const staffIds = [...new Set(
            logs
                .filter((log) => log.entity_type === "STAFF")
                .map((log) => Number(log.entity_id))
                .filter((id) => Number.isInteger(id)),
        )];

        if (staffIds.length === 0) {
            return logs.map((log) => ({ ...log, target_staff: null }));
        }

        const staffRows = await this.auditRepository.findStaffNamesByIds(staffIds, tx);
        const staffById = new Map(staffRows.map((staff) => [staff.staff_id, staff]));

        return logs.map((log) => ({
            ...log,
            target_staff: log.entity_type === "STAFF" ? (staffById.get(Number(log.entity_id)) ?? null) : null,
        }));
    }
}
