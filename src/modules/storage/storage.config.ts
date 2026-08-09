import { env } from "@config";

export const storageConfig = {
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    bucket: env.STORAGE_BUCKET,
    // Strip any trailing slash(es) — StorageService.getPublicUrl() joins this
    // with the object key via a single "/", so a trailing slash on the env
    // var (easy to paste in by accident) would silently double up into
    // ".../bucket//key" and 404 against Supabase's storage API.
    publicUrlBase: env.STORAGE_PUBLIC_URL_BASE?.replace(/\/+$/, ""),
};

/**
 * True only once real storage credentials are present. Until then, upload
 * endpoints reject with a clear "not configured" error instead of crashing —
 * same degrade-gracefully pattern as `isWhatsAppConfigured`. Swapping from
 * Supabase Storage's S3-compatible endpoint to real AWS S3 later is a config
 * change (these six env vars), not a code change — the same @aws-sdk/client-s3
 * client is used either way.
 */
export const isStorageConfigured = !!(
    storageConfig.endpoint &&
    storageConfig.region &&
    storageConfig.accessKeyId &&
    storageConfig.secretAccessKey &&
    storageConfig.bucket &&
    storageConfig.publicUrlBase
);
