/**
 * Quota quotidien par utilisateur pour les fonctions coûteuses (IA, imports).
 *
 * Les limites par minute ne suffisent pas : une seule personne peut épuiser
 * en une journée les quotas gratuits Gemini / Groq de toute la plateforme.
 * Le compteur est en mémoire et repart à zéro à minuit (UTC) ou au redémarrage.
 *
 * Variables : AI_QUOTA_JOUR (défaut 100), IMPORTS_QUOTA_JOUR (défaut 20).
 */

const { journaliser } = require("../utils/journalSecurite");

const compteurs = new Map(); // `${nom}:${jour}:${utilisateurId}` -> nombre
let jourCourant = null;

const aujourdhui = () => new Date().toISOString().slice(0, 10);

const minuitSuivant = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
};

const quotaQuotidien = (nom, variable, maxParDefaut, message) => (req, res, next) => {
  const utilisateurId = req.utilisateur?.id;
  if (!utilisateurId) return next(); // proteger() s'exécute avant : cas improbable

  const jour = aujourdhui();
  if (jour !== jourCourant) {
    compteurs.clear(); // nouveau jour : on repart de zéro (et la mémoire reste bornée)
    jourCourant = jour;
  }

  const max = parseInt(process.env[variable] || String(maxParDefaut), 10);
  const cle = `${nom}:${jour}:${utilisateurId}`;
  const utilise = compteurs.get(cle) || 0;

  res.set("X-Quota-Limite", String(max));
  if (utilise >= max) {
    journaliser("quota.atteint", req, { quota: nom, utilisateurId, max }, "warn");
    res.set("Retry-After", String(Math.ceil((minuitSuivant() - Date.now()) / 1000)));
    res.set("X-Quota-Restant", "0");
    return res.status(429).json({ success: false, code: "QUOTA_JOUR_ATTEINT", message });
  }

  compteurs.set(cle, utilise + 1);
  res.set("X-Quota-Restant", String(max - utilise - 1));
  next();
};

const quotaIA = quotaQuotidien(
  "ia",
  "AI_QUOTA_JOUR",
  100,
  "Tu as atteint ta limite quotidienne de requêtes IA. Elle se réinitialise demain."
);

const quotaImports = quotaQuotidien(
  "imports",
  "IMPORTS_QUOTA_JOUR",
  20,
  "Tu as atteint ta limite quotidienne d'imports de cours. Elle se réinitialise demain."
);

/** Réservé aux tests */
const _reinitialiserQuotas = () => {
  compteurs.clear();
  jourCourant = null;
};

module.exports = { quotaQuotidien, quotaIA, quotaImports, _reinitialiserQuotas };
