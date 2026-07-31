import { AnnouncementTargetType, Prisma, PrismaClient } from "@generated/prisma/client";

export interface CreateAnnouncementData {
    message: string;
    type: string;
    target_type: AnnouncementTargetType;
    target_staff_id?: number;
    target_role_id?: number;
    email_sent: boolean;
    created_by_staff_id: number;
}

export class AnnouncementRepository {
    constructor(private readonly prisma: PrismaClient) {}

    public async create(data: CreateAnnouncementData, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;
        return db.announcement.create({ data });
    }

    public async getActive(page: number, limit: number) {
        const [rows, total] = await Promise.all([
            this.prisma.announcement.findMany({
                where: { is_active: true },
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    target_staff: { select: { staff_id: true, first_name: true, last_name: true } },
                    target_role: { select: { role_id: true, role_name: true } },
                },
            }),
            this.prisma.announcement.count({ where: { is_active: true } }),
        ]);

        return { rows, total };
    }

    public async withdraw(announcementId: number, tx?: Prisma.TransactionClient) {
        const db = tx ?? this.prisma;
        return db.announcement.updateMany({
            where: { announcement_id: announcementId, is_active: true },
            data: { is_active: false, withdrawn_at: new Date() },
        });
    }
}
