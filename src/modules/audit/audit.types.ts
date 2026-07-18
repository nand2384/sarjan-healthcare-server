import { AuditAction, AuditEntityType, Prisma } from "@generated/prisma/client";

export interface CreateAuditLogData {
    performed_by_staff_id?: number;
    entity_type: AuditEntityType;
    entity_id: string;
    action: AuditAction;
    old_values?: Prisma.InputJsonValue;
    new_values?: Prisma.InputJsonValue;
    ip_address?: string;
    user_agent?: string;
}

export interface GetAuditLogsFilters {
    page?: number;
    limit?: number;
    search?: string;
    performed_by_staff_id?: number;
    entity_type?: AuditEntityType;
    entity_id?: string;
    action?: AuditAction | AuditAction[];
    start_date?: string;
    end_date?: string;
}
