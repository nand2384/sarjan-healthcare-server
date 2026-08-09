import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { AppError, ErrorCode } from "@errors";
import { storageConfig, isStorageConfigured } from "./storage.config";

/**
 * Generic object storage — not photo-specific. Backs doctor photo uploads
 * today; the same `upload`/`delete`/`getPublicUrl` surface is meant to be
 * reused later for medical report/receipt PDFs or any other future upload
 * need, so callers should stay unaware of the underlying provider.
 *
 * Built on the real AWS S3 SDK pointed at Supabase Storage's S3-compatible
 * endpoint. Moving to actual AWS S3 later is purely an env var change
 * (STORAGE_ENDPOINT/REGION/credentials/bucket) — this class doesn't change.
 */
export class StorageService {
    private readonly client: S3Client | null;

    constructor() {
        this.client = isStorageConfigured
            ? new S3Client({
                  endpoint: storageConfig.endpoint,
                  region: storageConfig.region,
                  credentials: {
                      accessKeyId: storageConfig.accessKeyId!,
                      secretAccessKey: storageConfig.secretAccessKey!,
                  },
                  // Required by most S3-compatible providers (including
                  // Supabase Storage) — virtual-hosted-style bucket URLs
                  // don't resolve against them.
                  forcePathStyle: true,
              })
            : null;
    }

    private assertConfigured(): S3Client {
        if (!this.client) {
            throw new AppError(503, ErrorCode.INTERNAL_SERVER_ERROR, "File storage isn't configured yet.");
        }
        return this.client;
    }

    public async upload(buffer: Buffer, key: string, contentType: string): Promise<{ key: string }> {
        const client = this.assertConfigured();
        await client.send(
            new PutObjectCommand({
                Bucket: storageConfig.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            }),
        );
        return { key };
    }

    public async delete(key: string): Promise<void> {
        const client = this.assertConfigured();
        await client.send(new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
    }

    /** Pure string concat, no network call — the URL is derived, never persisted, so a bucket/CDN domain change never needs a data migration. */
    public getPublicUrl(key: string): string {
        return `${storageConfig.publicUrlBase}/${key}`;
    }
}
