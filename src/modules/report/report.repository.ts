import { PrismaClient } from "@generated/prisma/client";

export interface CreateReportData {
    page_path: string;
    page_label: string;
    description: string;
    user_agent?: string;
    reported_by_staff_id: number;
}

const REPORTER_SELECT = { staff_id: true, first_name: true, last_name: true } as const;

export class ReportRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async create(data: CreateReportData) {
        return this.prisma.report.create({ data });
    }

    /** Everything the developer email needs, in one read. */
    public async findForEmail(reportId: number) {
        return this.prisma.report.findUnique({
            where: { report_id: reportId },
            include: {
                reported_by: {
                    select: {
                        first_name: true,
                        last_name: true,
                        username: true,
                        email: true,
                        staff_roles: { select: { role: { select: { role_name: true } } } },
                    },
                },
            },
        });
    }

    public async markEmailed(reportId: number) {
        return this.prisma.report.update({
            where: { report_id: reportId },
            data: {
                emailed_at: new Date(),
                email_last_error: null,
                email_attempts: { increment: 1 },
            },
        });
    }

    public async markEmailFailed(reportId: number, errorMessage: string) {
        return this.prisma.report.update({
            where: { report_id: reportId },
            data: {
                email_last_error: errorMessage.slice(0, 500),
                email_attempts: { increment: 1 },
            },
        });
    }

    /**
     * Reports whose developer email hasn't gone out yet. `olderThan` keeps the
     * retry job off a report whose first (inline) send is still in flight.
     */
    public async findUnsentEmails(maxAttempts: number, olderThan: Date, newerThan: Date, limit: number) {
        return this.prisma.report.findMany({
            where: {
                emailed_at: null,
                email_attempts: { lt: maxAttempts },
                created_at: { lt: olderThan, gt: newerThan },
            },
            select: { report_id: true },
            orderBy: { created_at: "asc" },
            take: limit,
        });
    }

    public async list(page: number, limit: number) {
        const [rows, total] = await Promise.all([
            this.prisma.report.findMany({
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    report_id: true,
                    page_path: true,
                    page_label: true,
                    description: true,
                    user_agent: true,
                    created_at: true,
                    emailed_at: true,
                    email_attempts: true,
                    email_last_error: true,
                    reported_by: { select: REPORTER_SELECT },
                },
            }),
            this.prisma.report.count(),
        ]);

        return { rows, total };
    }
}
