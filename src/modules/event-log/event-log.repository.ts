import { EventLogType, EventLogOutcome, Prisma, PrismaClient } from "@generated/prisma/client";

export interface CreateEventLogData {
    log_type: EventLogType;
    outcome: EventLogOutcome;
    subject: string;
    message?: string;
    metadata?: Prisma.InputJsonValue;
    started_at?: Date;
    finished_at?: Date;
}

export interface UpdateEventLogData {
    outcome: EventLogOutcome;
    message?: string;
    finished_at: Date;
}

export interface FindEventLogsFilters {
    log_type: EventLogType;
    page?: number;
    limit?: number;
    /** Filters inside `metadata` — e.g. { path: "channel", equals: "EMAIL" }. */
    metadataEquals?: { path: string; equals: string };
}

export class EventLogRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async create(data: CreateEventLogData) {
        return this.prisma.eventLog.create({ data });
    }

    public async update(eventLogId: bigint, data: UpdateEventLogData) {
        return this.prisma.eventLog.update({ where: { event_log_id: eventLogId }, data });
    }

    private buildWhere(filters: FindEventLogsFilters) {
        const { log_type, metadataEquals } = filters;
        return {
            log_type,
            ...(metadataEquals && {
                metadata: { path: [metadataEquals.path], equals: metadataEquals.equals },
            }),
        };
    }

    public async findMany(filters: FindEventLogsFilters) {
        const { page = 1, limit = 20 } = filters;

        return this.prisma.eventLog.findMany({
            where: this.buildWhere(filters),
            orderBy: { started_at: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        });
    }

    public async count(filters: FindEventLogsFilters) {
        return this.prisma.eventLog.count({ where: this.buildWhere(filters) });
    }

    /** Latest row (by started_at) per distinct subject, for a given type — powers "last run per job" views. */
    public async findLatestPerSubject(logType: EventLogType) {
        const subjects = await this.prisma.eventLog.findMany({
            where: { log_type: logType },
            distinct: ["subject"],
            select: { subject: true },
        });

        const latestRows = await Promise.all(
            subjects.map((s) =>
                this.prisma.eventLog.findFirst({
                    where: { log_type: logType, subject: s.subject },
                    orderBy: { started_at: "desc" },
                }),
            ),
        );

        return latestRows.filter((row) => row !== null);
    }

    public async findRecentBySubject(logType: EventLogType, subject: string, limit: number) {
        return this.prisma.eventLog.findMany({
            where: { log_type: logType, subject },
            orderBy: { started_at: "desc" },
            take: limit,
        });
    }

    public async deleteOlderThan(logType: EventLogType, cutoff: Date) {
        const result = await this.prisma.eventLog.deleteMany({
            where: { log_type: logType, started_at: { lt: cutoff } },
        });
        return result.count;
    }
}
