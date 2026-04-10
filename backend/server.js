/**
 * Point d'entrée du serveur backend
 * Express + MongoDB + Claude API
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const connectDB = require("./src/config/db");

// Import des routes
const authRoutes = require("./src/routes/auth");
const courseRoutes = require("./src/routes/courses");
const ficheRoutes = require("./src/routes/fiches");
const quizRoutes = require("./src/routes/quiz");
const aiRoutes = require("./src/routes/ai");
const progressionRoutes = require("./src/routes/progression");
const {
  limiteurGlobal,
  limiteurAuth,
  limiteurIA,
  entetesSécurité,
  sanitiserInputs,
  validerTaillePayload,
} = require("./src/middleware/securite");

const app = express();

// Connexion à MongoDB
connectDB();

// ── CORS EN PREMIER — doit précéder tous les autres middlewares ────
// FRONTEND_URL peut contenir plusieurs origines séparées par des virgules
// Ex: FRONTEND_URL=http://localhost:5173,http://localhost:3000
const originesAutorisees = (process.env.FRONTEND_URL || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origin (Postman, curl, tests)
      if (!origin) return callback(null, true);
      if (originesAutorisees.includes(origin)) return callback(null, true);
      // En développement, autoriser tous les localhost
      if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origine non autorisée par CORS : ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Middlewares de sécurité ────────────────────────────────────────
app.use(entetesSécurité);
app.use(limiteurGlobal);
app.use(validerTaillePayload);

// cookies
app.use(cookieParser());

// ── Parsing du corps ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Anti-injection NoSQL
app.use(sanitiserInputs);

// Dossier uploads statique
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes API — rate limiter spécifique sur auth et IA
app.use("/api/auth", limiteurAuth, authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/fiches", ficheRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/ai", limiteurIA, aiRoutes);
app.use("/api/progression", progressionRoutes);

// Route de santé
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Serveur opérationnel", version: "1.0.0" });
});

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
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

const PORT = process.env.PORT || 5001; // 5001 = cohérent avec VITE_API_URL du frontend

// Si le fichier est exécuté directement, démarrer le serveur.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`📚 Environnement : ${process.env.NODE_ENV || "development"}`);
  });
}

module.exports = app; // export pour les tests
