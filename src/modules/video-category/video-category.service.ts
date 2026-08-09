import { AppError, ErrorCode } from "@errors";
import { getYoutubeThumbnailUrl } from "utils/youtube.util";
import { VideoCategoryRepository, CreateVideoCategoryData, UpdateVideoCategoryData } from "./video-category.repository";

export class VideoCategoryService {
    constructor(private readonly videoCategoryRepository: VideoCategoryRepository) {}

    public async getAll() {
        return this.videoCategoryRepository.findAll();
    }

    public async create(data: CreateVideoCategoryData) {
        return this.videoCategoryRepository.create(data);
    }

    public async update(id: number, data: UpdateVideoCategoryData) {
        const existing = await this.videoCategoryRepository.findById(id);
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Video category not found");
        }
        return this.videoCategoryRepository.update(id, data);
    }

    /** Public landing-page grid — one card per category, cover = its first active video's thumbnail. */
    public async getPublicCategories() {
        const categories = await this.videoCategoryRepository.findActiveWithVideoCount();
        return categories.map((category) => ({
            id: category.video_category_id,
            name: category.name,
            description: category.description,
            videoCount: category._count.videos,
            thumbnailUrl: category.videos[0] ? getYoutubeThumbnailUrl(category.videos[0].youtube_video_id) : null,
        }));
    }
}
