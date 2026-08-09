import { PrismaClient } from "@generated/prisma/client";

export interface CreateVideoData {
    video_category_id: number;
    title: string;
    youtube_url: string;
    youtube_video_id: string;
    display_order?: number;
}

export interface UpdateVideoData {
    title?: string;
    youtube_url?: string;
    youtube_video_id?: string;
    display_order?: number;
    is_active?: boolean;
}

export class VideoRepository {
    constructor(private readonly prisma: PrismaClient) {}

    /** All videos in a category, active and inactive — the admin management list needs to see both. */
    public async findByCategoryId(categoryId: number) {
        return this.prisma.video.findMany({
            where: { video_category_id: categoryId },
            orderBy: [{ display_order: "asc" }, { video_id: "asc" }],
        });
    }

    public async findById(id: number) {
        return this.prisma.video.findUnique({ where: { video_id: id } });
    }

    public async create(data: CreateVideoData) {
        return this.prisma.video.create({ data });
    }

    public async update(id: number, data: UpdateVideoData) {
        return this.prisma.video.update({ where: { video_id: id }, data });
    }

    public async delete(id: number) {
        return this.prisma.video.delete({ where: { video_id: id } });
    }

    /** Active videos for one category, public landing page's expanded category view. */
    public async findActiveByCategoryId(categoryId: number) {
        return this.prisma.video.findMany({
            where: { video_category_id: categoryId, is_active: true, category: { is_active: true } },
            orderBy: [{ display_order: "asc" }, { video_id: "asc" }],
        });
    }
}
