import { NotificationRepository } from "./notification.repository";
import { AppError, ErrorCode } from "@errors";

export class NotificationService {
    constructor(private readonly notificationRepository: NotificationRepository) {}

    public async getNotifications(staffId: number) {
        return this.notificationRepository.getByStaffId(staffId);
    }

    public async markAsRead(notificationId: number, staffId: number) {
        const result = await this.notificationRepository.markAsRead(notificationId, staffId);

        if (result.count === 0) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Notification not found");
        }

        return { success: true };
    }
}
