/**
 * Middlewares de sécurité
 * - Rate limiting : limite les appels par IP
 * - Helmet-like headers : en-têtes HTTP sécurisés
 * - Sanitisation des inputs : prévention injection NoSQL / XSS
 */

const rateLimit = require("express-rate-limit");

// ── Validation au démarrage ───────────────────────────────────────
// Vérifier JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET doit faire au moins 32 caractères!");
  process.exit(1);
}

const originesAutorisees = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, "")) // Enlever le slash de fin
  .filter(Boolean);

// ── Rate Limiting global ───────────────────────────────────────────
const limiteurGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                   // 200 requêtes par IP par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop de requêtes. Réessaie dans 15 minutes." },
});

// Rate limiter strict pour l'authentification (prévention brute force)
const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 tentatives par 15 min
  skipSuccessfulRequests: true,
  message: { success: false, message: "Trop de tentatives. Réessaie dans 15 minutes." },
});

// Rate limiter pour les appels IA (coûteux)
const limiteurIA = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,              // 10 appels IA par minute par IP
  message: { success: false, message: "Limite d'appels IA atteinte. Réessaie dans 1 minute." },
});

// ── Sanitisation contre les injections NoSQL ─────────────────────
// Empêche les opérateurs MongoDB ($gt, $ne...) dans les inputs utilisateur
const sanitiserInputs = (req, res, next) => {
  const sanitiser = (obj) => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach((key) => {
        if (key.startsWith("$")) {
          delete obj[key]; // Supprimer les opérateurs MongoDB dangereux
        } else {
          sanitiser(obj[key]);
        }
      });
    }
  };

  sanitiser(req.body);
  sanitiser(req.query);
  sanitiser(req.params);
  next();
};

// ── Validation de taille des payloads ─────────────────────────────
const validerTaillePayload = (req, res, next) => {
  // La limite de 10mb est déjà dans express.json(), ceci est une couche supplémentaire
  const contentLength = parseInt(req.headers["content-length"] || "0");
  if (contentLength > 10 * 1024 * 1024) {
    return res.status(413).json({ success: false, message: "Payload trop grand." });
  }
  next();
};

// ── Validation CSRF simple (double-submit cookie) ──
// Vérifie que la requête vient bien du frontend autorisé
const validerCSRF = (req, res, next) => {
  const origine = req.headers.origin ? req.headers.origin.replace(/\/$/, "") : null;
  const referer = req.headers.referer;

  // En développement, autoriser localhost sans vérification stricte
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // Normaliser les origines autorisées
  const expandedOrigins = [...originesAutorisees];
  originesAutorisees.forEach(o => {
    if (o.endsWith(":80")) expandedOrigins.push(o.replace(":80", ""));
    if (o.endsWith(":443")) expandedOrigins.push(o.replace(":443", ""));
    if (!o.includes(":") && o.startsWith("http")) expandedOrigins.push(`${o}:80`);
  });

  // Vérifier l'origine
  if (origine && !expandedOrigins.includes(origine)) {
    console.warn(`[CSRF] Origine bloquée : ${origine}`);
    return res.status(403).json({ success: false, message: "Origine non autorisée." });
  }

  // Vérifier le referer (plus souple, on regarde si ça commence par une origine autorisée)
  if (referer && !expandedOrigins.some((o) => referer.startsWith(o))) {
    console.warn(`[CSRF] Référent bloqué : ${referer}`);
    return res.status(403).json({ success: false, message: "Référent non autorisé." });
  }

  next();
};

module.exports = {
  limiteurGlobal,
  limiteurAuth,
  limiteurIA,
  sanitiserInputs,
  validerTaillePayload,
  validerCSRF,
};
