/**
 * Point d'entrée du serveur backend
 * Express + PostgreSQL + Claude API
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");

// Garantir que le dossier uploads/ existe et est accessible
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}
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
const carnetRoutes = require("./src/routes/carnets");
const {
  limiteurGlobal,
  limiteurAuth,
  limiteurIA,
  sanitiserInputs,
  validerTaillePayload,
  validerCSRF,
  estOrigineAutorisee,
} = require("./src/middleware/securite");

const app = express();

// Nombre de proxys de confiance devant le serveur, pour lire la vraie IP du client
// (limites de requêtes, journal de sécurité). Production : Vercel → Render = 2.
const sautsProxy = parseInt(process.env.TRUST_PROXY || "1", 10);
app.set("trust proxy", Number.isNaN(sautsProxy) ? 1 : sautsProxy);

// Logger de requêtes simple (chemin seul : pas de query string dans les logs)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Connexion à PostgreSQL
connectDB();

// ── CORS — liste blanche stricte (voir middleware/securite.js) ─────
const devOrigine = (origin) =>
  process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: function (origin, callback) {
      // Pas d'origine (curl, app mobile, même origine) : CORS ne s'applique pas
      if (!origin || estOrigineAutorisee(origin) || devOrigine(origin)) {
        return callback(null, true);
      }
      // Refus silencieux : pas d'en-têtes CORS, le navigateur bloque la réponse
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
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
      connectSrc: ["'self'", "https://185-98-136-82.sslip.io", "https://*.vercel.app", "https://*.trycloudflare.com", "https://*.google.com", "https://*.groq.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  // HSTS 1 an + sous-domaines (OWASP / RFC 6797)
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use(limiteurGlobal);
app.use(validerTaillePayload);

// cookies
if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 32) {
  console.error("❌ COOKIE_SECRET doit faire au moins 32 caractères!");
  process.exit(1);
}
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Parsing du corps ──────────────────────────────────────────────
// Les fichiers passent par multer (multipart) : 10 Mo suffisent pour le JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Anti-injection NoSQL
app.use(sanitiserInputs);

// Le dossier uploads/ n'est plus servi publiquement : les cours importés
// étaient lisibles par n'importe qui sans authentification (OWASP A01).

// Routes API — rate limiter spécifique sur auth et IA + validation CSRF
app.use("/api/auth", validerCSRF, limiteurAuth, authRoutes);
app.use("/api/courses", validerCSRF, courseRoutes);
app.use("/api/fiches", validerCSRF, ficheRoutes);
app.use("/api/quiz", validerCSRF, quizRoutes);
app.use("/api/ai", validerCSRF, limiteurIA, aiRoutes);
app.use("/api/progression", validerCSRF, progressionRoutes);
app.use("/api/analytics", validerCSRF, analyticsRoutes);
app.use("/api/carnets", validerCSRF, carnetRoutes);

// Route de santé
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Serveur opérationnel", version: "1.1.0" });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, _next) => {
  console.error("Erreur serveur:", err.stack);

  // Erreurs d'upload (taille, type de fichier) : erreur client
  if (err.name === "MulterError" || err.code === "TYPE_FICHIER_INVALIDE") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Requête trop volumineuse." });
  }

  const statut = err.status || err.statusCode || 500;
  // OWASP A05 : ne pas divulguer les détails internes des erreurs 5xx en production
  const message =
    statut >= 500 && process.env.NODE_ENV === "production"
      ? "Erreur interne du serveur"
      : err.message || "Erreur interne du serveur";
  res.status(statut).json({ success: false, message });
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
      await waitForRedis(5000);
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
      await new Promise((resolve) => server.close(resolve));
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
