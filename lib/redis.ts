import { createClient } from "redis";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: ReturnType<typeof createClient> | undefined;
}

export async function getRedis() {
  if (!global.__redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("Missing REDIS_URL");

    const client = createClient({ url });

    client.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    await client.connect();
    global.__redisClient = client;
  }

  return global.__redisClient;
}