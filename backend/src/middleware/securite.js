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

// ── Origines autorisées (CORS + CSRF) ────────────────────────────
// OWASP : liste blanche explicite. Le joker « *.vercel.app » a été retiré :
// n'importe qui peut déployer un site sur vercel.app et, avec des cookies
// SameSite=None, envoyer des requêtes authentifiées au nom de l'utilisateur.
const ORIGINE_PAR_DEFAUT = "https://kaay-nafaar.vercel.app";

const normaliser = (o) => o.trim().replace(/\/$/, "");

const originesAutorisees = [
  ...new Set(
    [ORIGINE_PAR_DEFAUT, ...(process.env.FRONTEND_URL || "").split(",")]
      .map(normaliser)
      .filter(Boolean)
  ),
];

// Optionnel : expression régulière pour les previews Vercel de CE projet
// ex. CORS_ORIGIN_REGEX=^https://kaay-nafaar-[a-z0-9]+-moussa-ndioukh-fayes-projects\.vercel\.app$
let regexOrigine = null;
if (process.env.CORS_ORIGIN_REGEX) {
  try {
    regexOrigine = new RegExp(process.env.CORS_ORIGIN_REGEX);
  } catch {
    console.error("⚠️ CORS_ORIGIN_REGEX invalide — ignorée");
  }
}

const estOrigineAutorisee = (origine) => {
  if (!origine) return false;
  const o = normaliser(origine);
  if (originesAutorisees.includes(o)) return true;
  return regexOrigine ? regexOrigine.test(o) : false;
};

const METHODES_SURES = ["GET", "HEAD", "OPTIONS"];

// ── Rate Limiting ─────────────────────────────────────────────────
// L'IP du client est lue via « trust proxy » (voir TRUST_PROXY dans server.js) :
// derrière Vercel + Render, il y a deux proxys entre l'étudiant et le serveur.
const { journaliser } = require("../utils/journalSecurite");

const quandLimiteAtteinte = (nom, message) => (req, res) => {
  journaliser("limite.atteinte", req, { limiteur: nom }, "warn");
  res.status(429).json({ success: false, message });
};

const emailDuCorps = (req) => String(req.body?.email || "").toLowerCase().trim();

const limiteurGlobal = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LIMITE_GLOBALE || "300", 10), // requêtes par IP par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  handler: quandLimiteAtteinte("global", "Trop de requêtes. Réessaie dans 15 minutes."),
});

// Rate limiter pour l'authentification, par IP (prévention brute force)
const limiteurAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 échecs par 15 min et par IP
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: quandLimiteAtteinte("auth", "Trop de tentatives. Réessaie dans 15 minutes."),
});

// Limite par compte : protège un compte même si l'attaquant change d'IP,
// et n'empêche pas les autres étudiants de se connecter.
const limiteurConnexionCompte = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 échecs par compte par 15 min
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `compte:${emailDuCorps(req)}`,
  skip: (req) => !emailDuCorps(req),
  handler: quandLimiteAtteinte(
    "connexion-compte",
    "Trop de tentatives sur ce compte. Réessaie dans 15 minutes ou réinitialise ton mot de passe."
  ),
});

// Demandes d'email (mot de passe oublié, renvoi de confirmation) : par adresse
const limiteurEmailsSortants = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5, // 5 demandes par adresse et par heure
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `email:${emailDuCorps(req)}`,
  skip: (req) => !emailDuCorps(req),
  handler: quandLimiteAtteinte("emails", "Trop de demandes pour cette adresse. Réessaie dans une heure."),
});

// Rate limiter pour les appels IA (coûteux)
const limiteurIA = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 appels IA par minute par IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: quandLimiteAtteinte("ia", "Limite d'appels IA atteinte. Réessaie dans 1 minute."),
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
  // Augmenter la limite à 50mb pour les gros PDF
  const contentLength = parseInt(req.headers["content-length"] || "0");
  if (contentLength > 50 * 1024 * 1024) {
    return res.status(413).json({ success: false, message: "Fichier trop volumineux (max 50 Mo)." });
  }
  next();
};

// ── Validation CSRF simple (double-submit cookie) ──
// Vérifie que la requête vient bien du frontend autorisé
const validerCSRF = (req, res, next) => {
  // En développement, autoriser localhost sans vérification stricte
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // Les requêtes de lecture ne modifient rien (OWASP CSRF Cheat Sheet)
  if (METHODES_SURES.includes(req.method)) return next();

  const origine = req.headers.origin || null;
  let origineReferer = null;
  if (req.headers.referer) {
    try {
      origineReferer = new URL(req.headers.referer).origin;
    } catch {
      origineReferer = "invalide";
    }
  }

  if (origine && !estOrigineAutorisee(origine)) {
    journaliser("csrf.refus", req, { origine }, "warn");
    return res.status(403).json({ success: false, message: "Origine non autorisée." });
  }

  // Comparaison exacte de l'origine du référent (et non plus un simple startsWith)
  if (!origine && origineReferer && !estOrigineAutorisee(origineReferer)) {
    journaliser("csrf.refus", req, { referent: origineReferer }, "warn");
    return res.status(403).json({ success: false, message: "Référent non autorisé." });
  }

  // Requête modifiante authentifiée par cookie sans Origin ni Referer : refusée.
  // Les clients API (mobile, scripts) utilisent l'en-tête Authorization.
  const authParCookie = Boolean(req.cookies?.token) && !req.headers.authorization;
  if (!origine && !origineReferer && authParCookie) {
    return res.status(403).json({ success: false, message: "Origine manquante." });
  }

  next();
};

module.exports = {
  limiteurGlobal,
  limiteurAuth,
  limiteurIA,
  limiteurConnexionCompte,
  limiteurEmailsSortants,
  sanitiserInputs,
  validerTaillePayload,
  validerCSRF,
  estOrigineAutorisee,
  originesAutorisees,
};
