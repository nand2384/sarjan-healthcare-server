import multer from "multer";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Generic single-image-upload middleware factory — not doctor-photo-specific.
 * Memory storage (not disk) since the buffer goes straight into
 * StorageService.upload(); nothing is ever written to the Express host's disk.
 *
 * Both the size cap and the mime-type whitelist are enforced here, server-side
 * — never trust a client-side-only check, since anyone can call the API
 * directly. Multer aborts the upload stream as soon as the size limit is hit,
 * so an oversized payload doesn't even finish buffering into memory.
 */
export function singleImageUpload(fieldName: string, maxSizeBytes = 5 * 1024 * 1024) {
    return multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: maxSizeBytes },
        fileFilter: (_req, file, cb) => {
            if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
                cb(new Error("Only JPEG, PNG, or WEBP images are allowed."));
                return;
            }
            cb(null, true);
        },
    }).single(fieldName);
}
