const Redis = require("ioredis");
const RedisMock = require("ioredis-mock");

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 3) {
      // On arrête de spammer les logs après 3 tentatives
      return null;
    }
    return Math.min(times * 50, 2000);
  },
};

let redisInstance;
let isMock = false;

try {
  if (process.env.NODE_ENV === "test") {
    redisInstance = new RedisMock();
    isMock = true;
  } else {
    redisInstance = new Redis(redisConfig);
  }
} catch (e) {
  console.warn("⚠️ Impossible d'initialiser Redis, passage sur ioredis-mock.");
  redisInstance = new RedisMock();
  isMock = true;
}

// Gestion des erreurs pour éviter le flood
redisInstance.on("error", (err) => {
  if (!isMock) {
    console.warn("❌ Redis déconnecté. Passage en mode mémoire (mock).");
    // Swap pour le mock
    redisInstance.disconnect();
    redisInstance = new RedisMock();
    isMock = true;
  }
});

const waitForRedis = async (timeoutMs = 2000) => {
  if (isMock) return true;
  
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn("⚠️ Redis injoignable, utilisation du mode mémoire.");
      redisInstance = new RedisMock();
      isMock = true;
      resolve(true);
    }, timeoutMs);

    redisInstance.ping()
      .then(() => {
        clearTimeout(timer);
        console.log("✅ Redis prêt");
        resolve(true);
      })
      .catch(() => {
        // L'erreur est gérée par le listener global
      });
  });
};

module.exports = { 
  get redis() { return redisInstance; }, 
  redisConfig, 
  waitForRedis 
};
