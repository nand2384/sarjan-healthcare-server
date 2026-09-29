import { appContext } from "../app.context";
import { schedule } from "./schedule";

/**
 * Re-sends developer emails for bug reports whose first (inline) send failed.
 * Hourly is plenty — the report is already saved and readable on the Reports
 * page; this only makes sure the email eventually arrives too.
 */
export function startReportEmailRetryJob() {
    schedule("report-email-retry", "30 * * * *", async () => {
        return appContext.services.reportService.retryUnsentEmails();
    });
}
