import { PrismaClient } from "@generated/prisma/client";

export class NotificationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getByStaffId(staffId: number) {
        return this.prisma.notification.findMany({
            where: { staff_id: staffId },
            orderBy: { created_at: "desc" },
            take: 50,
        });
    }

    public async markAsRead(notificationId: number, staffId: number) {
        return this.prisma.notification.updateMany({
            where: { notification_id: notificationId, staff_id: staffId },
            data: { is_read: true },
        });
    }
}
