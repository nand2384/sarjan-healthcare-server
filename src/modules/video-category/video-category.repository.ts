import { PrismaClient } from "@generated/prisma/client";

export interface CreateVideoCategoryData {
    name: string;
    description?: string;
    display_order?: number;
}

export interface UpdateVideoCategoryData {
    name?: string;
    description?: string | null;
    display_order?: number;
    is_active?: boolean;
}

export class VideoCategoryRepository {
    constructor(private readonly prisma: PrismaClient) {}

    /** All categories, active and inactive, with a video count — the admin management list needs to see both. */
    public async findAll() {
        return this.prisma.videoCategory.findMany({
            orderBy: [{ display_order: "asc" }, { video_category_id: "asc" }],
            include: { _count: { select: { videos: true } } },
        });
    }

    public async findById(id: number) {
        return this.prisma.videoCategory.findUnique({ where: { video_category_id: id } });
    }

    public async create(data: CreateVideoCategoryData) {
        return this.prisma.videoCategory.create({ data });
    }

    public async update(id: number, data: UpdateVideoCategoryData) {
        return this.prisma.videoCategory.update({ where: { video_category_id: id }, data });
    }

    /** Active categories that have at least one active video — feeds the public landing page grid. */
    public async findActiveWithVideoCount() {
        const categories = await this.prisma.videoCategory.findMany({
            where: { is_active: true },
            orderBy: [{ display_order: "asc" }, { video_category_id: "asc" }],
            include: {
                videos: {
                    where: { is_active: true },
                    orderBy: [{ display_order: "asc" }, { video_id: "asc" }],
                    take: 1,
                },
                _count: { select: { videos: { where: { is_active: true } } } },
            },
        });
        return categories.filter((category) => category._count.videos > 0);
    }
}
