import { redisClient } from "./redis.client";

export async function checkRedisHealth(): Promise<void> {
    await redisClient.ping();
}
