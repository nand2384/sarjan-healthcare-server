import { env, buildInfo } from "@config";
import { logger } from "@logger";
import { MailerService } from "mailer";
import { ReportRepository } from "./report.repository";
import { CreateReportSchema } from "./report.schema";

// Give up on a report's developer email after this many failed sends — it stays
// readable on the Reports page either way.
const MAX_EMAIL_ATTEMPTS = 5;
// The retry job ignores reports younger than this so it can't double-send while
// the inline first attempt is still in flight...
const RETRY_MIN_AGE_MS = 10 * 60 * 1000;
// ...and stops chasing reports older than this (the page still shows them).
const RETRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_BATCH_SIZE = 20;

export class ReportService {
    constructor(
        private readonly reportRepository: ReportRepository,
        private readonly mailerService: MailerService,
    ) {}

    /**
     * Saves the report, then emails it to the developer without making the
     * reporter wait on SMTP. The saved row is the record of truth: if the email
     * fails it stays unsent and the hourly retry job picks it up, and the
     * developer can always read it on the Reports page.
     */
    public async submit(dto: CreateReportSchema, reporterStaffId: number, userAgent?: string) {
        const report = await this.reportRepository.create({
            page_path: dto.page_path,
            page_label: dto.page_label,
            description: dto.description,
            user_agent: userAgent,
            reported_by_staff_id: reporterStaffId,
        });

        void this.sendReportEmail(report.report_id);

        return { report_id: report.report_id };
    }

    public async list(page: number, limit: number) {
        const { rows, total } = await this.reportRepository.list(page, limit);
        return { rows, total, page, limit };
    }

    /** Never throws — used fire-and-forget after submit and from the retry job. Returns whether the email was accepted. */
    private async sendReportEmail(reportId: number): Promise<boolean> {
        try {
            if (!env.REPORT_RECIPIENT_EMAIL) {
                logger.warn({ reportId }, "REPORT_RECIPIENT_EMAIL is not set — report saved but not emailed");
                return false;
            }

            const report = await this.reportRepository.findForEmail(reportId);
            if (!report) return false;

            const reporter = report.reported_by;

            try {
                await this.mailerService.sendBugReportMail({
                    to: env.REPORT_RECIPIENT_EMAIL,
                    replyTo: reporter.email,
                    reportId,
                    reporterName: `${reporter.first_name} ${reporter.last_name}`,
                    reporterRoles: reporter.staff_roles.map((staffRole) => staffRole.role.role_name),
                    reporterUsername: reporter.username,
                    pageLabel: report.page_label,
                    pagePath: report.page_path,
                    description: report.description,
                    userAgent: report.user_agent ?? undefined,
                    submittedAtFormatted: report.created_at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }),
                    serverVersion: `${env.APP_VERSION ?? buildInfo.fallbackVersion} (${env.GIT_COMMIT_SHA ?? buildInfo.fallbackCommit})`,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                logger.error({ err: error, reportId }, "Failed to email bug report");
                await this.reportRepository.markEmailFailed(reportId, message);
                return false;
            }

            await this.reportRepository.markEmailed(reportId);
            return true;
        } catch (error) {
            logger.error({ err: error, reportId }, "Unexpected error while emailing bug report");
            return false;
        }
    }

    /** Called by the hourly retry job. */
    public async retryUnsentEmails(): Promise<{ attempted: number; sent: number; failed: number }> {
        if (!env.REPORT_RECIPIENT_EMAIL) {
            return { attempted: 0, sent: 0, failed: 0 };
        }

        const now = Date.now();
        const pending = await this.reportRepository.findUnsentEmails(
            MAX_EMAIL_ATTEMPTS,
            new Date(now - RETRY_MIN_AGE_MS),
            new Date(now - RETRY_MAX_AGE_MS),
            RETRY_BATCH_SIZE,
        );

        let sent = 0;
        for (const { report_id } of pending) {
            if (await this.sendReportEmail(report_id)) sent++;
        }

        return { attempted: pending.length, sent, failed: pending.length - sent };
    }
}
