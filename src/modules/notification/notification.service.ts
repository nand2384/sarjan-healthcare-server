import { Prisma } from "@generated/prisma/client";
import { NotificationRepository, CreateNotificationData } from "./notification.repository";
import { AppError, ErrorCode } from "@errors";
import { WebSocketPublisher } from "websocket";

export class NotificationService {
    constructor(private readonly notificationRepository: NotificationRepository) {}

    public async getNotifications(staffId: number, page: number, limit: number) {
        const { rows, total } = await this.notificationRepository.getByStaffId(staffId, page, limit);
        return { rows, total, page, limit };
    }

    public async getUnreadCount(staffId: number) {
        const count = await this.notificationRepository.getUnreadCount(staffId);
        return { count };
    }

    /**
     * Persists a visible notification for a staff member. The DB row is the
     * source of truth — if the staff member is offline, nothing is lost; they'll
     * see it next time they fetch GET /notifications.
     *
     * When called inside an open transaction (`tx`), the WebSocket ping is
     * deliberately NOT fired here — the transaction could still roll back.
     * Callers using `tx` must call `pingNew(staffId)` themselves once the
     * transaction has actually committed.
     */
    public async notify(staffId: number, data: Omit<CreateNotificationData, "staff_id">, tx?: Prisma.TransactionClient) {
        const notification = await this.notificationRepository.create({ ...data, staff_id: staffId }, tx);

        if (!tx) {
            this.pingNew(staffId);
        }

        return notification;
    }

    /** Fires the lightweight "a new notification exists" WebSocket ping. Safe to call post-commit. */
    public pingNew(staffId: number): void {
        WebSocketPublisher.notificationCreated(staffId);
    }

    public async markAsRead(notificationId: number, staffId: number) {
        const result = await this.notificationRepository.markAsRead(notificationId, staffId);

        if (result.count === 0) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Notification not found");
        }

        return { success: true };
    }
}
