import IORedis from "ioredis";
import { env } from "@config";

// BullMQ requires an ioredis connection specifically — the existing `redisClient`
// (src/cache/redis.client.ts) uses the `redis` npm package, a different client
// library that BullMQ can't use. This is a separate connection to the same
// Redis instance, dedicated to the job queue.
export const queueConnection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});
