import { logger } from "@logger";
import { Prisma } from "@generated/prisma/client";
import { EventLogRepository } from "./event-log.repository";

const MAX_STACK_LENGTH = 4000;
const MAX_ERROR_MESSAGE_LENGTH = 1000;

interface ErrorLogRow {
    error_log_id: string;
    request_id: string | null;
    method: string | null;
    url: string | null;
    status_code: number;
    message: string;
    stack: string | null;
    created_at: Date;
}

interface DeliveryLogRow {
    delivery_log_id: string;
    channel: string;
    recipient: string;
    subject_or_template: string;
    status: "SENT" | "FAILED";
    error_message: string | null;
    created_at: Date;
}

interface JobRunRow {
    job_run_log_id: string;
    job_name: string;
    status: "RUNNING" | "SUCCESS" | "FAILED";
    started_at: Date;
    finished_at: Date | null;
    error_message: string | null;
    /** What the job actually did — e.g. { scheduled: 5, skipped: 2 }, { deleted: 12 }. Whatever shape that job's task() returns. Null for older rows recorded before this existed, or a job that returned nothing. */
    details: Record<string, unknown> | null;
}

/**
 * Single home for what used to be three near-identical tables
 * (JobRunLog/ErrorLog/DeliveryLog). Each `record*` method writes a
 * `log_type`-tagged row; each `get*` method reads it back reshaped into the
 * same field names the client/other server code already expects, so nothing
 * outside this module needs to know the underlying table was consolidated.
 */
export class EventLogService {
    constructor(private readonly eventLogRepository: EventLogRepository) {}

    // ---- JOB_RUN (cron jobs + the reminder queue) ----

    /** Never throws — a monitoring-log write must never break the job it's observing. */
    public async recordStart(jobName: string): Promise<bigint | undefined> {
        try {
            const row = await this.eventLogRepository.create({
                log_type: "JOB_RUN",
                outcome: "RUNNING",
                subject: jobName,
            });
            return row.event_log_id;
        } catch (error) {
            logger.error({ err: error, jobName }, "Failed to record job run start");
            return undefined;
        }
    }

    public async recordSuccess(eventLogId: bigint | undefined, details?: Record<string, unknown>): Promise<void> {
        if (eventLogId === undefined) return;
        try {
            await this.eventLogRepository.update(eventLogId, {
                outcome: "SUCCESS",
                finished_at: new Date(),
                ...(details && { metadata: details as Prisma.InputJsonValue }),
            });
        } catch (error) {
            logger.error({ err: error, eventLogId: eventLogId.toString() }, "Failed to record job run success");
        }
    }

    public async recordFailure(eventLogId: bigint | undefined, errorMessage: string): Promise<void> {
        if (eventLogId === undefined) return;
        try {
            await this.eventLogRepository.update(eventLogId, {
                outcome: "FAILED",
                message: errorMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH),
                finished_at: new Date(),
            });
        } catch (error) {
            logger.error({ err: error, eventLogId: eventLogId.toString() }, "Failed to record job run failure");
        }
    }

    public async getLatestPerJob(): Promise<JobRunRow[]> {
        const rows = await this.eventLogRepository.findLatestPerSubject("JOB_RUN");
        return rows.map((row) => this.toJobRunRow(row));
    }

    public async getRecentRunsForJob(jobName: string, limit = 20): Promise<JobRunRow[]> {
        const rows = await this.eventLogRepository.findRecentBySubject("JOB_RUN", jobName, limit);
        return rows.map((row) => this.toJobRunRow(row));
    }

    private toJobRunRow(row: { event_log_id: bigint; subject: string; outcome: string; started_at: Date; finished_at: Date | null; message: string | null; metadata?: unknown }): JobRunRow {
        return {
            job_run_log_id: row.event_log_id.toString(),
            job_name: row.subject,
            status: row.outcome as JobRunRow["status"],
            started_at: row.started_at,
            finished_at: row.finished_at,
            error_message: row.message,
            details: (row.metadata as Record<string, unknown> | null) ?? null,
        };
    }

    // ---- ERROR (5xx responses from error.middleware.ts) ----

    /** Never throws — persisting an error must never break the error response it's logging. */
    public async recordError(data: { request_id?: string; method?: string; url?: string; status_code: number; message: string; stack?: string }): Promise<void> {
        try {
            await this.eventLogRepository.create({
                log_type: "ERROR",
                outcome: "FAILED",
                subject: data.url ?? "(unknown url)",
                message: data.message,
                metadata: {
                    request_id: data.request_id ?? null,
                    method: data.method ?? null,
                    status_code: data.status_code,
                    stack: data.stack?.slice(0, MAX_STACK_LENGTH) ?? null,
                },
                finished_at: new Date(),
            });
        } catch (error) {
            logger.error({ err: error }, "Failed to persist error log");
        }
    }

    public async getErrorLogs(filters: { page?: number; limit?: number }) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;

        const [rows, total] = await Promise.all([
            this.eventLogRepository.findMany({ log_type: "ERROR", page, limit }),
            this.eventLogRepository.count({ log_type: "ERROR" }),
        ]);

        const data: ErrorLogRow[] = rows.map((row) => {
            const metadata = (row.metadata ?? {}) as Record<string, unknown>;
            return {
                error_log_id: row.event_log_id.toString(),
                request_id: (metadata.request_id as string | null) ?? null,
                method: (metadata.method as string | null) ?? null,
                url: row.subject,
                status_code: (metadata.status_code as number) ?? 500,
                message: row.message ?? "",
                stack: (metadata.stack as string | null) ?? null,
                created_at: row.started_at,
            };
        });

        return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    // ---- DELIVERY (email/WhatsApp sends) ----

    /** Never throws — a delivery-log write must never affect the send it's observing. */
    public async recordDelivery(data: { channel: "EMAIL" | "WHATSAPP"; recipient: string; subject_or_template: string; status: "SENT" | "FAILED"; error_message?: string }): Promise<void> {
        try {
            await this.eventLogRepository.create({
                log_type: "DELIVERY",
                outcome: data.status === "SENT" ? "SUCCESS" : "FAILED",
                subject: data.recipient,
                message: data.error_message,
                metadata: { channel: data.channel, subject_or_template: data.subject_or_template },
                finished_at: new Date(),
            });
        } catch (error) {
            logger.error({ err: error }, "Failed to persist delivery log");
        }
    }

    public async getDeliveryLogs(filters: { page?: number; limit?: number; channel?: "EMAIL" | "WHATSAPP" }) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const baseFilters = {
            log_type: "DELIVERY" as const,
            page,
            limit,
            ...(filters.channel && { metadataEquals: { path: "channel", equals: filters.channel } }),
        };

        const [rows, total] = await Promise.all([
            this.eventLogRepository.findMany(baseFilters),
            this.eventLogRepository.count(baseFilters),
        ]);

        const data: DeliveryLogRow[] = rows.map((row) => {
            const metadata = (row.metadata ?? {}) as Record<string, unknown>;
            return {
                delivery_log_id: row.event_log_id.toString(),
                channel: (metadata.channel as string) ?? "EMAIL",
                recipient: row.subject,
                subject_or_template: (metadata.subject_or_template as string) ?? "",
                status: row.outcome === "SUCCESS" ? "SENT" : "FAILED",
                error_message: row.message,
                created_at: row.started_at,
            };
        });

        return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    // ---- Retention ----

    public async pruneOlderThan(logType: "JOB_RUN" | "ERROR" | "DELIVERY", days: number): Promise<number> {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return this.eventLogRepository.deleteOlderThan(logType, cutoff);
    }
}
