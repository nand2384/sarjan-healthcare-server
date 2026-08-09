const YOUTUBE_URL_PATTERNS = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
];

/** Extracts the 11-char video ID from any of the URL formats a user might paste; null if none match. */
export function extractYoutubeVideoId(url: string): string | null {
    for (const pattern of YOUTUBE_URL_PATTERNS) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export function getYoutubeThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
