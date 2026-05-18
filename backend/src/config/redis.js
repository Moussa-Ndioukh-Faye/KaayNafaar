const Redis = require(process.env.NODE_ENV === "test" ? "ioredis-mock" : "ioredis");

const redisConfig = {
  host: process.env.REDIS_HOST || (process.env.NODE_ENV === "production" ? "redis" : "localhost"),
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null, // Requis par BullMQ (null = infini)
  retryStrategy: (times) => Math.min(times * 50, 2000), // max 2s entre tentatives
};

const redis = new Redis(redisConfig);

redis.on("connect", () => console.log("💾 Redis connecté"));
redis.on("error", (err) => console.error("❌ Erreur Redis:", err));

const waitForRedis = async (timeoutMs = 10000) => {
  const debut = Date.now();
  while (Date.now() - debut < timeoutMs) {
    try {
      await redis.ping();
      console.log("✅ Redis prêt");
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error("Redis indisponible après " + timeoutMs + "ms");
};

module.exports = { redis, redisConfig, waitForRedis };
