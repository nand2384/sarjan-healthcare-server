import { createClient } from "redis";

import { env } from "@config";

export const redisClient = createClient({
    url: env.REDIS_URL,
});

redisClient.on("error", (error) => {
    console.error("Redis Error:", error);
});
