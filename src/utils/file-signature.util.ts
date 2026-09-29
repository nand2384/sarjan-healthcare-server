import { fileTypeFromBuffer } from "file-type";
import { AppError, ErrorCode } from "@errors";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXTENSION_BY_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export interface DetectedImage {
    mimeType: string;
    extension: string;
}

/**
 * Reads the file's actual magic bytes — not the client-supplied filename or
 * Content-Type header, both fully spoofable (multer's fileFilter only checks
 * the header, which is a cheap first filter, not a guarantee) — and confirms
 * it's really one of the allowed image types. Returns the server-verified
 * mime type and extension to use for storage; callers should use these, never
 * the client's originalname/mimetype, for the stored key or S3 ContentType.
 */
export async function detectImageOrThrow(buffer: Buffer): Promise<DetectedImage> {
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected || !ALLOWED_IMAGE_MIME_TYPES.has(detected.mime)) {
        throw new AppError(
            415,
            ErrorCode.UNSUPPORTED_FILE_TYPE,
            "The uploaded file doesn't look like a valid JPEG, PNG, or WEBP image.",
        );
    }

    return { mimeType: detected.mime, extension: EXTENSION_BY_MIME[detected.mime] };
}
