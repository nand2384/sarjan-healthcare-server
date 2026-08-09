import { AppError, ErrorCode } from "@errors";
import { extractYoutubeVideoId, getYoutubeThumbnailUrl } from "utils/youtube.util";
import { VideoRepository } from "./video.repository";

export interface CreateVideoInput {
    video_category_id: number;
    title: string;
    youtube_url: string;
    display_order?: number;
}

export interface UpdateVideoInput {
    title?: string;
    youtube_url?: string;
    display_order?: number;
    is_active?: boolean;
}

export class VideoService {
    constructor(private readonly videoRepository: VideoRepository) {}

    public async getByCategoryId(categoryId: number) {
        return this.videoRepository.findByCategoryId(categoryId);
    }

    public async create(data: CreateVideoInput) {
        const youtubeVideoId = extractYoutubeVideoId(data.youtube_url);
        if (!youtubeVideoId) {
            throw new AppError(400, ErrorCode.BAD_REQUEST, "That doesn't look like a valid YouTube URL.");
        }
        return this.videoRepository.create({ ...data, youtube_video_id: youtubeVideoId });
    }

    public async update(id: number, data: UpdateVideoInput) {
        const existing = await this.videoRepository.findById(id);
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Video not found");
        }

        let youtubeVideoId: string | undefined;
        if (data.youtube_url) {
            const extracted = extractYoutubeVideoId(data.youtube_url);
            if (!extracted) {
                throw new AppError(400, ErrorCode.BAD_REQUEST, "That doesn't look like a valid YouTube URL.");
            }
            youtubeVideoId = extracted;
        }

        return this.videoRepository.update(id, { ...data, youtube_video_id: youtubeVideoId });
    }

    public async delete(id: number) {
        const existing = await this.videoRepository.findById(id);
        if (!existing) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Video not found");
        }
        return this.videoRepository.delete(id);
    }

    /** Public — a category's active videos, reshaped for the landing page's video grid/modal player. */
    public async getPublicByCategoryId(categoryId: number) {
        const videos = await this.videoRepository.findActiveByCategoryId(categoryId);
        return videos.map((video) => ({
            id: video.video_id,
            title: video.title,
            youtubeVideoId: video.youtube_video_id,
            thumbnailUrl: getYoutubeThumbnailUrl(video.youtube_video_id),
        }));
    }
}
