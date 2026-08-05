import { PrismaClient } from "@generated/prisma/client";
import { ReportRepository, ListReportsFilters } from "./report.repository";
import { StaffRepository } from "@modules/staff/staff.repository";
import { NotificationService } from "@modules/notification/notification.service";
import { CreateReportSchema, UpdateReportStatusSchema } from "./report.schema";
import { AppError, ErrorCode } from "@errors";
import { logger } from "@logger";

const REPORT_TYPE_LABEL: Record<string, string> = {
    BUG: "Bug/Error",
    UPDATE: "Update Request",
    FEATURE_REQUEST: "Feature Request",
};

const DEVELOPER_ROLE_NAME = "Developer";

function reportActionUrl(reportId: number): string {
    return `/reports/${reportId}`;
}

export class ReportService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly reportRepository: ReportRepository,
        private readonly staffRepository: StaffRepository,
        private readonly notificationService: NotificationService,
    ) {}

    /**
     * Fire-and-forget from the reporter's side — no toast beyond success and no
     * persisted "my reports" list is required to find this again (the floating
     * widget's "Your Reports" tab and the notification's action_url both serve
     * that instead). Developers are notified via the same in-app notification
     * system Announcement uses.
     */
    public async submit(dto: CreateReportSchema, reporterStaffId: number) {
        let developerStaffIds: number[] = [];

        const report = await this.prisma.$transaction(async (tx) => {
            const created = await this.reportRepository.create({
                report_type: dto.report_type,
                page_path: dto.page_path,
                page_label: dto.page_label,
                description: dto.description,
                reported_by_staff_id: reporterStaffId,
            }, tx);

            const developerRoleId = await this.reportRepository.findRoleIdByName(DEVELOPER_ROLE_NAME);

            if (developerRoleId) {
                const reporter = await this.staffRepository.findById(reporterStaffId, tx);
                const reporterName = reporter ? `${reporter.first_name} ${reporter.last_name}` : "A staff member";

                const developers = await this.staffRepository.getActiveStaffIdsByRole(developerRoleId, reporterStaffId, tx);
                developerStaffIds = developers.map((developer) => developer.staff_id);

                await Promise.all(developerStaffIds.map((staffId) =>
                    this.notificationService.notify(staffId, {
                        title: `New ${REPORT_TYPE_LABEL[dto.report_type] ?? dto.report_type} report`,
                        message: `From ${reporterName} — ${dto.page_label}: ${dto.description}`,
                        type: "INFO",
                        action_url: reportActionUrl(created.report_id),
                    }, tx)
                ));
            } else {
                logger.warn("No Developer role found — skipping report notification fan-out");
            }

            return created;
        });

        // Post-commit: live-ping every developer's bell
        developerStaffIds.forEach((staffId) => this.notificationService.pingNew(staffId));

        return report;
    }

    public async list(page: number, limit: number, filters: ListReportsFilters) {
        const { rows, total } = await this.reportRepository.list(page, limit, filters);
        return { rows, total, page, limit };
    }

    public async getStatusCounts() {
        return this.reportRepository.getStatusCounts();
    }

    public async listMine(staffId: number) {
        return this.reportRepository.listMine(staffId);
    }

    /**
     * The one piece of visibility the original reporter gets pushed to them — a
     * single notification with the outcome, deep-linking into the same
     * conversation thread they can also reach via the widget's "Your Reports" tab.
     */
    public async updateStatus(reportId: number, dto: UpdateReportStatusSchema, actorStaffId: number) {
        const existing = await this.reportRepository.findById(reportId);
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Report not found");
        }

        const updated = await this.reportRepository.updateStatus(reportId, {
            status: dto.status,
            developer_notes: dto.developer_notes,
            resolved_by_staff_id: actorStaffId,
        });

        const statusLabel = dto.status.replace(/_/g, " ").toLowerCase();
        await this.notificationService.notify(updated.reported_by_staff_id, {
            title: "Your report has an update",
            message: `Your report on "${updated.page_label}" is now ${statusLabel}.`,
            type: "INFO",
            action_url: reportActionUrl(reportId),
        });

        return updated;
    }

    private async authorizeAccess(reportId: number, actorStaffId: number, isDeveloper: boolean) {
        const report = await this.reportRepository.getDetail(reportId);
        if (!report) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Report not found");
        }

        if (!isDeveloper && report.reported_by_staff_id !== actorStaffId) {
            throw new AppError(403, ErrorCode.FORBIDDEN, "You do not have access to this report");
        }

        return report;
    }

    public async getReportDetail(reportId: number, actorStaffId: number, isDeveloper: boolean) {
        const report = await this.authorizeAccess(reportId, actorStaffId, isDeveloper);
        const messages = await this.reportRepository.getMessages(reportId);
        return { report, messages };
    }

    public async postMessage(reportId: number, actorStaffId: number, isDeveloper: boolean, message: string) {
        const report = await this.authorizeAccess(reportId, actorStaffId, isDeveloper);

        const created = await this.reportRepository.addMessage(reportId, actorStaffId, message);

        const isReporterReplying = actorStaffId === report.reported_by_staff_id;

        let recipientStaffIds: number[] = [];

        if (isReporterReplying) {
            const developerRoleId = await this.reportRepository.findRoleIdByName(DEVELOPER_ROLE_NAME);
            if (developerRoleId) {
                const developers = await this.staffRepository.getActiveStaffIdsByRole(developerRoleId, actorStaffId);
                recipientStaffIds = developers.map((developer) => developer.staff_id);
            }
        } else {
            recipientStaffIds = [report.reported_by_staff_id];
        }

        const senderName = `${created.sender.first_name} ${created.sender.last_name}`;

        await Promise.all(recipientStaffIds.map((staffId) =>
            this.notificationService.notify(staffId, {
                title: `New reply from ${senderName}`,
                message: `On "${report.page_label}": ${message}`,
                type: "INFO",
                action_url: reportActionUrl(reportId),
            })
        ));

        return created;
    }
}
