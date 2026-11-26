/**
 * Middlewares d'erreurs : référence de requête, route inconnue, gestionnaire global.
 */

const crypto = require("crypto");
const { traduireErreur, CODES_PAR_STATUT } = require("./index");
const { journaliser } = require("../utils/journalSecurite");

/** Référence courte, lisible au téléphone (ex. « K7Q2-9MZD ») */
const nouvelleReference = () => {
  const brut = crypto.randomBytes(5).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `${brut.slice(0, 4)}-${brut.slice(4, 8).padEnd(4, "0")}`;
};

/** Chaque requête reçoit une référence, renvoyée dans l'en-tête X-Request-Id */
const referenceRequete = (req, res, next) => {
  // Une référence fournie par un proxy de confiance est reprise si elle est sûre
  const entrante = req.get("x-request-id");
  req.id = entrante && /^[A-Za-z0-9-]{6,64}$/.test(entrante) ? entrante : nouvelleReference();
  res.set("X-Request-Id", req.id);

  // Toute réponse d'erreur JSON (y compris celles des contrôleurs existants) reçoit
  // la référence et un code stable, sans modifier chaque contrôleur
  const json = res.json.bind(res);
  res.json = (corps) => {
    if (res.statusCode === 403) {
      // Accès refusé (ressource d'un autre, origine refusée, CSRF) : trace au journal de sécurité
      journaliser("acces.refuse", req, { reference: req.id, motif: String(corps?.message || "").slice(0, 80) }, "warn");
    }
    if (res.statusCode >= 400 && corps && typeof corps === "object" && !Array.isArray(corps)) {
      corps = { ...corps, code: corps.code || CODES_PAR_STATUT[res.statusCode] || "ERREUR", reference: corps.reference || req.id };
    }
    return json(corps);
  };
  next();
};

const routeIntrouvable = (req, res) => {
  res.status(404).json({ success: false, code: "ROUTE_INTROUVABLE", message: "Route introuvable.", reference: req.id });
};

// eslint-disable-next-line no-unused-vars
const gestionnaireErreurs = (err, req, res, _next) => {
  const { status, code, message, details, grave } = traduireErreur(err);
  const contexte = `[${req.id || "-"}] ${req.method} ${req.path} → ${status} ${code}`;

  if (grave) console.error(`💥 ${contexte}\n${err.stack || err.message}`);
  else if (process.env.NODE_ENV !== "test") console.warn(`⚠️ ${contexte} : ${String(err.message).slice(0, 200)}`);

  // Réponse déjà commencée (flux SSE, téléchargement) : on ne peut que fermer proprement
  if (res.headersSent) {
    try {
      res.end();
    } catch (_) {
      /* connexion déjà fermée */
    }
    return;
  }

  if (status === 429 && err.retryAfter) res.set("Retry-After", String(err.retryAfter));
  res.status(status).json({
    success: false,
    code,
    message,
    ...(details ? { details } : {}),
    reference: req.id,
  });
};

module.exports = { referenceRequete, routeIntrouvable, gestionnaireErreurs, nouvelleReference };
