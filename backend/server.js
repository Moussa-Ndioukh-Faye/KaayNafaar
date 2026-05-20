/**
 * Point d'entrée du serveur backend
 * Express + PostgreSQL + Claude API
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./src/config/database");
const { redis, waitForRedis } = require("./src/config/redis");
require("./src/models/associations");

// Import des routes
const authRoutes = require("./src/routes/auth");
const courseRoutes = require("./src/routes/courses");
const ficheRoutes = require("./src/routes/fiches");
const quizRoutes = require("./src/routes/quiz");
const aiRoutes = require("./src/routes/ai");
const progressionRoutes = require("./src/routes/progression");
const analyticsRoutes = require("./src/routes/analytics");
const {
  limiteurGlobal,
  limiteurAuth,
  limiteurIA,
  sanitiserInputs,
  validerTaillePayload,
  validerCSRF,
} = require("./src/middleware/securite");

const app = express();

// Logger de requêtes simple
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Connexion à PostgreSQL
connectDB();

// ── CORS — Autoriser Vercel ─────────────────────────────
const originsFixes = (process.env.FRONTEND_URL || "https://kaay-nafaar.vercel.app")
  .split(",")
  .map(s => s.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: function (origin, callback) {
      // Autoriser si pas d'origine (ex: curl) ou si dans la liste ou vercel
      if (!origin || originsFixes.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      callback(new Error("Non autorisé par CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Helmet + security middlewares ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*"],
      connectSrc: ["'self'", "https://*.kaaynafaar.com", "https://*.vercel.app", "https://*.trycloudflare.com", "https://*.google.com", "https://*.groq.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(limiteurGlobal);
app.use(validerTaillePayload);

// cookies
app.use(cookieParser(process.env.COOKIE_SECRET || "default-secret-change-me"));

// ── Parsing du corps ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Anti-injection NoSQL
app.use(sanitiserInputs);

// Dossier uploads statique
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes API — rate limiter spécifique sur auth et IA + validation CSRF
app.use("/api/auth", validerCSRF, limiteurAuth, authRoutes);
app.use("/api/courses", validerCSRF, courseRoutes);
app.use("/api/fiches", validerCSRF, ficheRoutes);
app.use("/api/quiz", validerCSRF, quizRoutes);
app.use("/api/ai", validerCSRF, limiteurIA, aiRoutes);
app.use("/api/progression", validerCSRF, progressionRoutes);
app.use("/api/analytics", validerCSRF, analyticsRoutes);

// Route de santé
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Serveur opérationnel", version: "1.1.0" });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, _next) => {
  console.error("Erreur serveur:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Erreur interne du serveur",
  });
});

// 404 pour routes inconnues
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route introuvable" });
});

const { worker } = require("./src/utils/worker");
const PORT = process.env.PORT || 5001;

// Si le fichier est exécuté directement, démarrer le serveur.
if (require.main === module) {
  (async () => {
    try {
      await waitForRedis(15000);
    } catch (err) {
      console.error("⚠️", err.message, "— BullMQ ne pourra pas traiter de jobs");
    }

    const server = app.listen(PORT, () => {
      console.log(`✅ Serveur démarré sur le port ${PORT}`);
      console.log(`📚 Environnement : ${process.env.NODE_ENV || "development"}`);
    });

    // ── Graceful Shutdown ──────────────────────────────────────────
    const arreter = async (signal) => {
      console.log(`\n🛑 Signal ${signal} reçu, arrêt gracieux...`);
      server.close();
      await worker.close();
      await redis.quit();
      console.log("👋 Arrêt terminé");
      process.exit(0);
    };
    process.on("SIGTERM", () => arreter("SIGTERM"));
    process.on("SIGINT", () => arreter("SIGINT"));
  })();
}

module.exports = app; // export pour les tests
