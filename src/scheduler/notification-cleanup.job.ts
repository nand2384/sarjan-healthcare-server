import { appContext } from "../app.context";
import { schedule } from "./schedule";

/**
 * Retention windows. Read notifications are pruned sooner since the staff
 * member has already seen them; unread ones are kept longer so nothing a
 * person never opened disappears within a normal absence (leave, holiday).
 */
const READ_RETENTION_DAYS = 30;
const UNREAD_RETENTION_DAYS = 90;

export function startNotificationCleanupJob() {
    // 03:15 daily — off-peak, and offset from the hourly session sweep.
    schedule("notification-cleanup", "15 3 * * *", async () => {
        const deleted = await appContext.services.notificationService.pruneOldNotifications(
            READ_RETENTION_DAYS,
            UNREAD_RETENTION_DAYS,
        );

        if (deleted > 0) {
            appContext.logger.info(
                { deleted, readRetentionDays: READ_RETENTION_DAYS, unreadRetentionDays: UNREAD_RETENTION_DAYS },
                "Pruned old notifications",
            );
        }

        return { deleted, readRetentionDays: READ_RETENTION_DAYS, unreadRetentionDays: UNREAD_RETENTION_DAYS };
    });
}
