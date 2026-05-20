const Redis = require("ioredis");
const dns = require("dns");

let RedisMock;
try {
  RedisMock = require("ioredis-mock");
} catch (_) {
  RedisMock = null;
}

const creerMock = () => {
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
};

let redisInstance;
let isMock = false;

const host = process.env.REDIS_HOST || "localhost";

try {
  let reachable = host === "localhost" || host === "127.0.0.1";

  if (!reachable) {
    try {
      dns.lookupSync(host);
      reachable = true;
    } catch (_) {
      reachable = false;
    }
  }

  if (process.env.NODE_ENV === "test" && RedisMock) {
    redisInstance = new RedisMock();
    isMock = true;
  } else if (!reachable) {
    console.warn("⚠️ Redis injoignable (DNS). Passage en mode mémoire.");
    creerMock();
  } else {
    redisInstance = new Redis({
      host,
      port: parseInt(process.env.REDIS_PORT || "6379"),
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    redisInstance.on("error", () => {});
  }
} catch (e) {
  console.warn("⚠️ Impossible d'initialiser Redis, passage en mode mémoire.");
  creerMock();
}

const waitForRedis = async (timeoutMs = 2000) => {
  if (isMock) return true;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn("⚠️ Redis injoignable, utilisation du mode mémoire.");
      creerMock();
      resolve(true);
    }, timeoutMs);

    redisInstance.ping()
      .then(() => {
        clearTimeout(timer);
        console.log("✅ Redis prêt");
        resolve(true);
      })
      .catch(() => {});
  });
};

module.exports = {
  get redis() { return redisInstance; },
  get redisConfig() { return { host, port: parseInt(process.env.REDIS_PORT || "6379") }; },
  get isMock() { return isMock; },
  waitForRedis,
};