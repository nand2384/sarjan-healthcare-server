import { Prisma, PrismaClient } from "@generated/prisma/client";

export interface CreateNotificationData {
    staff_id: number;
    title: string;
    message: string;
    type: string;
    action_url?: string | null;
}

export class NotificationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getByStaffId(staffId: number, page: number, limit: number) {
        const [rows, total] = await Promise.all([
            this.prisma.notification.findMany({
                where: { staff_id: staffId },
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.notification.count({ where: { staff_id: staffId } }),
        ]);

        return { rows, total };
    }

    public async getUnreadCount(staffId: number) {
        return this.prisma.notification.count({
            where: { staff_id: staffId, is_read: false },
        });
    }

    public async create(data: CreateNotificationData, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.notification.create({ data });
    }

    public async markAsRead(notificationId: number, staffId: number) {
        return this.prisma.notification.updateMany({
            where: { notification_id: notificationId, staff_id: staffId },
            data: { is_read: true },
        });
    }
}
