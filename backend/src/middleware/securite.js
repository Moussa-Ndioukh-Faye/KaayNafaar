/**
 * Middlewares de sécurité
 * - Rate limiting : limite les appels par IP
 * - Helmet-like headers : en-têtes HTTP sécurisés
 * - Sanitisation des inputs : prévention injection NoSQL / XSS
 */

const rateLimit = require("express-rate-limit");

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

// ── En-têtes de sécurité HTTP ─────────────────────────────────────
const entetesSécurité = (req, res, next) => {
  // Empêcher le clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Empêcher la détection de MIME type
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Content Security Policy (API JSON uniquement — pas d'HTML servi)
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  // HSTS (forcer HTTPS en production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Supprimer la signature du serveur
  res.removeHeader("X-Powered-By");
  next();
};

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

module.exports = {
  limiteurGlobal,
  limiteurAuth,
  limiteurIA,
  entetesSécurité,
  sanitiserInputs,
  validerTaillePayload,
};
