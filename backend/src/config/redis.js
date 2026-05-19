const Redis = require("ioredis");
let RedisMock;
try {
  RedisMock = require("ioredis-mock");
} catch (_) {
  RedisMock = null;
}

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
  if (process.env.NODE_ENV === "test" && RedisMock) {
    redisInstance = new RedisMock();
    isMock = true;
  } else {
    redisInstance = new Redis(redisConfig);
  }
} catch (e) {
  console.warn("⚠️ Impossible d'initialiser Redis, passage en mode mémoire.");
  if (RedisMock) {
    redisInstance = new RedisMock();
  } else {
    const { EventEmitter } = require("events");
    redisInstance = new EventEmitter();
    redisInstance.get = redisInstance.set = redisInstance.incr = redisInstance.del = async () => null;
    redisInstance.ping = async () => "PONG";
    redisInstance.quit = async () => {};
    redisInstance.disconnect = () => {};
  }
  isMock = true;
}

// Gestion des erreurs pour éviter le flood
redisInstance.on("error", (_err) => {
  if (!isMock) {
    console.warn("❌ Redis déconnecté. Passage en mode mémoire.");
    redisInstance.disconnect();
    if (RedisMock) {
      redisInstance = new RedisMock();
    }
    isMock = true;
  }
});

const waitForRedis = async (timeoutMs = 2000) => {
  if (isMock) return true;
  
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn("⚠️ Redis injoignable, utilisation du mode mémoire.");
      if (RedisMock) {
        redisInstance = new RedisMock();
      }
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
