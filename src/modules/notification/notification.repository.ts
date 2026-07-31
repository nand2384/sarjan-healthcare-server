import { Prisma, PrismaClient } from "@generated/prisma/client";

export interface CreateNotificationData {
    staff_id: number;
    title: string;
    message: string;
    type: string;
    action_url?: string | null;
    announcement_id?: number | null;
}

export class NotificationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async getByStaffId(staffId: number, page: number, limit: number, unreadOnly = false) {
        const where: Prisma.NotificationWhereInput = {
            staff_id: staffId,
            ...(unreadOnly ? { is_read: false } : {}),
        };

        const [rows, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.notification.count({ where }),
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

    public async markAllAsRead(staffId: number) {
        return this.prisma.notification.updateMany({
            where: { staff_id: staffId, is_read: false },
            data: { is_read: true },
        });
    }

    /** Staff ids holding a delivered copy of this announcement — collect before retracting so they can be pinged. */
    public async getRecipientIdsByAnnouncementId(announcementId: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        const rows = await prisma.notification.findMany({
            where: { announcement_id: announcementId },
            select: { staff_id: true },
        });
        return rows.map((row) => row.staff_id);
    }

    /** Retracts every delivered copy of a withdrawn announcement. */
    public async deleteByAnnouncementId(announcementId: number, tx?: Prisma.TransactionClient) {
        const prisma = tx ?? this.prisma;
        return prisma.notification.deleteMany({
            where: { announcement_id: announcementId },
        });
    }

    /** Retention: prunes notifications older than the given cutoffs. */
    public async deleteOlderThan(readCutoff: Date, unreadCutoff: Date) {
        return this.prisma.notification.deleteMany({
            where: {
                OR: [
                    { is_read: true, created_at: { lt: readCutoff } },
                    { is_read: false, created_at: { lt: unreadCutoff } },
                ],
            },
        });
    }
}
