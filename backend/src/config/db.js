/**
 * Configuration MongoDB
 * - En production  : utilise MONGO_URI du .env (Atlas ou autre)
 * - En développement : tente MongoDB local,
 *   puis bascule sur mongodb-memory-server si indisponible
 */

const mongoose = require("mongoose");

let mongoServer = null;

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || "";
  const isDev = process.env.NODE_ENV !== "production";

  // URI Atlas ou externe fournie → connexion directe
  const estUriExterne =
    mongoURI &&
    !mongoURI.includes("localhost") &&
    !mongoURI.includes("127.0.0.1");

  if (estUriExterne) {
    return connexionDirecte(mongoURI);
  }

  // Tenter la connexion MongoDB locale (timeout court pour ne pas bloquer)
  try {
    const uriLocale = mongoURI || "mongodb://127.0.0.1:27017/revision_app";
    await mongoose.connect(uriLocale, { serverSelectionTimeoutMS: 3000 });
    console.log("✅ MongoDB local connecté :", mongoose.connection.host);
    return;
  } catch (_) {
    if (!isDev) {
      console.error("❌ MongoDB introuvable. Configurez MONGO_URI dans .env");
      process.exit(1);
    }
    console.warn("⚠️  MongoDB local indisponible → démarrage du serveur en mémoire…");
  }

  // Fallback : MongoDB en mémoire pour le développement
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongoServer = await MongoMemoryServer.create({
      instance: { dbName: "revision_app" },
    });
    const memUri = mongoServer.getUri();
    await mongoose.connect(memUri);
    console.log("✅ MongoDB en mémoire démarré (données réinitialisées à chaque redémarrage)");
    console.log("   → Pour des données persistantes : configurez MONGO_URI dans .env avec MongoDB Atlas");
  } catch (err) {
    console.error("❌ Impossible de démarrer MongoDB en mémoire :", err.message);
    console.error("");
    console.error("   ── SOLUTION ─────────────────────────────────────────────");
    console.error("   1. Démarre MongoDB localement :  mongod");
    console.error("   2. OU installe MongoDB : https://www.mongodb.com/try/download/community");
    console.error("   3. OU configure une base Atlas gratuite dans .env (MONGO_URI=...)");
    console.error("   ──────────────────────────────────────────────────────────");
    console.error("   Le serveur démarre quand même mais les routes DB échoueront.");
    // Ne pas planter le serveur — il reste joignable sur le port 5001
  }
};

const connexionDirecte = async (uri) => {
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB Atlas connecté");
  } catch (err) {
    console.error("❌ Erreur connexion MongoDB Atlas :", err.message);
    process.exit(1);
  }
};

// Nettoyage propre à l'arrêt du serveur (SIGINT = Ctrl+C, SIGTERM = Docker/systemd)
const arreterProprement = async (signal) => {
  console.log(`\n🛑 Signal ${signal} reçu — arrêt MongoDB…`);
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
  console.log("🛑 MongoDB arrêté proprement.");
  process.exit(0);
};
process.on("SIGINT", () => arreterProprement("SIGINT"));
process.on("SIGTERM", () => arreterProprement("SIGTERM"));

module.exports = connectDB;
