import { AuditLog, Prisma, PrismaClient, AuditAction, AuditEntityType } from "@generated/prisma/client";

import { CreateAuditLogData, GetAuditLogsFilters } from "./audit.types";

export class AuditRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async create(
        data: CreateAuditLogData,
        tx?: Prisma.TransactionClient,
    ): Promise<AuditLog> {
        const db = tx ?? this.prisma;

        return db.auditLog.create({
            data: {
                entity_type: data.entity_type,
                entity_id: String(data.entity_id),
                action: data.action,
                old_values: data.old_values,
                new_values: data.new_values,
                ip_address: data.ip_address,
                user_agent: data.user_agent,

                ...(data.performed_by_staff_id && {
                    performed_by_staff: {
                        connect: {
                            staff_id: data.performed_by_staff_id,
                        },
                    },
                }),
            },
        });
    }

    public async findById(
        auditLogId: bigint,
        tx?: Prisma.TransactionClient,
    ): Promise<AuditLog | null> {
        const db = tx ?? this.prisma;

        return db.auditLog.findUnique({
            where: {
                audit_log_id: auditLogId,
            },
        });
    }

    public async findMany(filters: GetAuditLogsFilters, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;

        const {
            page = 1,
            limit = 20,
            search,
            performed_by_staff_id,
            entity_type,
            entity_id,
            action,
            start_date,
            end_date,
        } = filters;

        let matchedActions: AuditAction[] = [];
        let matchedEntities: AuditEntityType[] = [];
        
        if (search) {
            matchedActions = Object.values(AuditAction).filter(a => 
                a.toLowerCase().includes(search.toLowerCase())
            );
            matchedEntities = Object.values(AuditEntityType).filter(e => 
                e.toLowerCase().includes(search.toLowerCase())
            );
        }

        return db.auditLog.findMany({
            where: {
                    ...((start_date || end_date) && {
                        created_at: {
                            ...(start_date && { gte: new Date(`${start_date}T00:00:00.000Z`) }),
                            ...(end_date && { lte: new Date(`${end_date}T23:59:59.999Z`) }),
                        }
                    }),
                    ...(performed_by_staff_id && {
                        performed_by_staff_id,
                    }),
                    ...(entity_type && {
                        entity_type,
                    }),
                    ...(entity_id && {
                        entity_id: String(entity_id),
                    }),
                    ...(action && {
                        action: Array.isArray(action) ? { in: action } : action,
                    }),

                    ...(search && {
                        OR: [
                            { entity_id: { contains: search, mode: "insensitive" } },
                            ...(matchedActions.length > 0 ? [{ action: { in: matchedActions } }] : []),
                            ...(matchedEntities.length > 0 ? [{ entity_type: { in: matchedEntities } }] : []),
                            {
                                performed_by_staff: {
                                    OR: [
                                        {first_name: {contains: search, mode: "insensitive"}},
                                        {last_name: {contains: search, mode: "insensitive"}},
                                        {username: {contains: search, mode: "insensitive"}},
                                    ]
                                }
                            }
                        ]
                    })
            },
            include: {
                performed_by_staff: {
                    select: {
                        staff_id: true,
                        first_name: true,
                        last_name: true,
                        username: true,
                    },
                },
            },
            orderBy: {
                created_at: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    /** Resolves STAFF-entity audit rows' raw `entity_id` into a display name — see AuditService.getAuditLogs. */
    public async findStaffNamesByIds(staffIds: number[], tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;

        return db.staff.findMany({
            where: { staff_id: { in: staffIds } },
            select: { staff_id: true, first_name: true, last_name: true, username: true },
        });
    }

    public async count(
        filters: GetAuditLogsFilters,
        tx?: Prisma.TransactionClient,
    ): Promise<number> {
        const db = tx ?? this.prisma;

        const { performed_by_staff_id, entity_type, entity_id, action, search, start_date, end_date } = filters;

        let matchedActions: AuditAction[] = [];
        let matchedEntities: AuditEntityType[] = [];
        
        if (search) {
            matchedActions = Object.values(AuditAction).filter(a => 
                a.toLowerCase().includes(search.toLowerCase())
            );
            matchedEntities = Object.values(AuditEntityType).filter(e => 
                e.toLowerCase().includes(search.toLowerCase())
            );
        }

        return db.auditLog.count({
            where: {
                ...((start_date || end_date) && {
                    created_at: {
                        ...(start_date && { gte: new Date(`${start_date}T00:00:00.000Z`) }),
                        ...(end_date && { lte: new Date(`${end_date}T23:59:59.999Z`) }),
                    }
                }),
                ...(performed_by_staff_id && {
                    performed_by_staff_id,
                }),
                ...(entity_type && {
                    entity_type,
                }),
                ...(entity_id && {
                    entity_id: String(entity_id),
                }),
                ...(action && {
                    action: Array.isArray(action) ? { in: action } : action,
                }),

                ...(search && {
                    OR: [
                        { entity_id: { contains: search, mode: "insensitive" } },
                        ...(matchedActions.length > 0 ? [{ action: { in: matchedActions } }] : []),
                        ...(matchedEntities.length > 0 ? [{ entity_type: { in: matchedEntities } }] : []),
                        {
                            performed_by_staff: {
                                OR: [
                                    {first_name: {contains: search, mode: "insensitive"}},
                                    {last_name: {contains: search, mode: "insensitive"}},
                                    {username: {contains: search, mode: "insensitive"}},
                                ]
                            }
                        }
                    ]
                })
            },
        });
    }
}
