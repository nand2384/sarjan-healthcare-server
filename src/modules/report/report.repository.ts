import { Prisma, PrismaClient, ReportStatus, ReportType } from "@generated/prisma/client";

export interface CreateReportData {
    report_type: ReportType;
    page_path: string;
    page_label: string;
    description: string;
    reported_by_staff_id: number;
}

export interface ListReportsFilters {
    status?: ReportStatus;
    report_type?: ReportType;
}

export interface UpdateReportStatusData {
    status: ReportStatus;
    developer_notes?: string;
    resolved_by_staff_id: number;
}

const REPORTER_SELECT = { staff_id: true, first_name: true, last_name: true } as const;

export class ReportRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async create(data: CreateReportData, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;
        return db.report.create({ data });
    }

    public async findById(reportId: number) {
        return this.prisma.report.findUnique({ where: { report_id: reportId } });
    }

    public async getDetail(reportId: number) {
        return this.prisma.report.findUnique({
            where: { report_id: reportId },
            include: {
                reported_by: { select: REPORTER_SELECT },
                resolved_by: { select: REPORTER_SELECT },
            },
        });
    }

    public async addMessage(reportId: number, senderStaffId: number, message: string) {
        return this.prisma.reportMessage.create({
            data: { report_id: reportId, sender_staff_id: senderStaffId, message },
            include: { sender: { select: REPORTER_SELECT } },
        });
    }

    public async getMessages(reportId: number) {
        return this.prisma.reportMessage.findMany({
            where: { report_id: reportId },
            orderBy: { created_at: "asc" },
            include: { sender: { select: REPORTER_SELECT } },
        });
    }

    public async listMine(staffId: number) {
        return this.prisma.report.findMany({
            where: { reported_by_staff_id: staffId },
            orderBy: { updated_at: "desc" },
            take: 20,
            include: { _count: { select: { messages: true } } },
        });
    }

    public async list(page: number, limit: number, filters: ListReportsFilters) {
        const where: Prisma.ReportWhereInput = {
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.report_type ? { report_type: filters.report_type } : {}),
        };

        const [rows, total] = await Promise.all([
            this.prisma.report.findMany({
                where,
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    reported_by: { select: REPORTER_SELECT },
                    resolved_by: { select: REPORTER_SELECT },
                },
            }),
            this.prisma.report.count({ where }),
        ]);

        return { rows, total };
    }

    public async getStatusCounts() {
        const [byStatus, byType] = await Promise.all([
            this.prisma.report.groupBy({ by: ["status"], _count: { _all: true } }),
            this.prisma.report.groupBy({ by: ["report_type"], _count: { _all: true } }),
        ]);

        return { byStatus, byType };
    }

    public async updateStatus(reportId: number, data: UpdateReportStatusData) {
        const isResolved = data.status === "RESOLVED";

        return this.prisma.report.update({
            where: { report_id: reportId },
            data: {
                status: data.status,
                developer_notes: data.developer_notes,
                resolved_by_staff_id: isResolved ? data.resolved_by_staff_id : null,
                resolved_at: isResolved ? new Date() : null,
            },
        });
    }

    public async findRoleIdByName(roleName: string): Promise<number | null> {
        const role = await this.prisma.roleMaster.findFirst({
            where: { role_name: { equals: roleName, mode: "insensitive" } },
        });
        return role?.role_id ?? null;
    }
}
