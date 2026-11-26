/**
 * Filtre des requêtes — bloque, avant toute route, les attaques qui passent par l'URL,
 * la méthode HTTP ou le format du corps (OWASP A01/A03/A05, CWE-22, CWE-113, CWE-1321) :
 *
 *  - méthodes inattendues (TRACE, TRACK, CONNECT…) et en-têtes de « method override »
 *    qui permettraient de transformer un GET en DELETE           → 405 / 400
 *  - URL démesurée (attaque par épuisement, journaux pollués)       → 414
 *  - encodage invalide (%E0%A4%A), octet nul, retours à la ligne
 *    (injection d'en-têtes ou de lignes de journal)               → 400
 *  - remontée de dossiers (../, ..%2f, %2e%2e, double encodage, \) → 400
 *  - pollution de prototype (__proto__, constructor, prototype)
 *    dans l'URL ou dans le corps JSON                              → 400
 *  - paramètres dupliqués (?id=1&id=2, « HPP ») : la dernière valeur seule est gardée
 *  - corps trop imbriqué (déni de service par récursion)           → 400
 *  - type de corps inattendu (formulaire HTML : vecteur CSRF)      → 415
 *
 * Chaque blocage est écrit au journal de sécurité, avec la référence de la requête.
 */

const { journaliser } = require("../utils/journalSecurite");

const METHODES = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const ENTETES_OVERRIDE = ["x-http-method-override", "x-http-method", "x-method-override"];
const URL_MAX = 2048;
const PROFONDEUR_MAX = 20;
const CLES_INTERDITES = new Set(["__proto__", "constructor", "prototype"]);
const TYPES_CORPS = [/^application\/json\b/i, /^multipart\/form-data\b/i, /^text\/plain\b/i];

/** Décodage répété (jusqu'à 3 fois) : déjoue le double encodage (%252e%252e → ..) */
const decoderEntierement = (texte) => {
  let courant = texte;
  for (let i = 0; i < 3; i += 1) {
    const suivant = decodeURIComponent(courant);
    if (suivant === courant) return courant;
    courant = suivant;
  }
  return courant;
};

// eslint-disable-next-line no-control-regex
const CARACTERES_CONTROLE = /[\u0000-\u001f\u007f]/;
const REMONTEE = /(^|[/\\])\.\.([/\\]|$)/;

/** Cherche une clé dangereuse ou une imbrication excessive ; renvoie la raison ou null */
const inspecter = (valeur, profondeur = 0) => {
  if (profondeur > PROFONDEUR_MAX) return "corps trop imbriqué";
  if (!valeur || typeof valeur !== "object") return null;
  for (const cle of Object.keys(valeur)) {
    if (CLES_INTERDITES.has(cle)) return `clé interdite « ${cle} »`;
    const raison = inspecter(valeur[cle], profondeur + 1);
    if (raison) return raison;
  }
  return null;
};

const refuser = (req, res, statut, code, message, raison) => {
  journaliser("requete.bloquee", req, { raison, code, reference: req.id }, "warn");
  res.status(statut).json({ success: false, code, message });
};

/** À placer avant les analyseurs de corps : méthode, URL, type de contenu */
const filtrerUrl = (req, res, next) => {
  if (!METHODES.has(req.method)) {
    res.set("Allow", [...METHODES].join(", "));
    return refuser(req, res, 405, "METHODE_NON_AUTORISEE", "Méthode non autorisée.", `méthode ${String(req.method).slice(0, 10)}`);
  }
  if (ENTETES_OVERRIDE.some((e) => req.headers[e] !== undefined)) {
    return refuser(req, res, 400, "REQUETE_INVALIDE", "Requête invalide.", "en-tête de substitution de méthode");
  }

  const brute = req.originalUrl || req.url || "";
  if (brute.length > URL_MAX) {
    return refuser(req, res, 414, "URL_TROP_LONGUE", "Adresse trop longue.", `URL de ${brute.length} caractères`);
  }

  let decodee;
  try {
    decodee = decoderEntierement(brute);
  } catch (_) {
    return refuser(req, res, 400, "URL_INVALIDE", "Adresse invalide.", "encodage invalide");
  }
  if (CARACTERES_CONTROLE.test(decodee)) {
    return refuser(req, res, 400, "URL_INVALIDE", "Adresse invalide.", "caractère de contrôle ou octet nul");
  }
  const chemin = decodee.split("?")[0];
  if (REMONTEE.test(chemin) || chemin.includes("\\")) {
    return refuser(req, res, 400, "URL_INVALIDE", "Adresse invalide.", "remontée de dossiers");
  }

  // Corps : seuls JSON, envoi de fichier et texte (signalement d'erreur) sont acceptés
  const aUnCorps = Number(req.headers["content-length"] || 0) > 0 || req.headers["transfer-encoding"];
  if (aUnCorps && ["POST", "PUT", "PATCH"].includes(req.method)) {
    const type = req.headers["content-type"] || "";
    if (!TYPES_CORPS.some((motif) => motif.test(type))) {
      return refuser(req, res, 415, "TYPE_NON_SUPPORTE", "Format de données non pris en charge.", `content-type ${type.slice(0, 60) || "absent"}`);
    }
  }
  next();
};

/** À placer après les analyseurs de corps : paramètres dupliqués, prototype, imbrication */
const filtrerDonnees = (req, res, next) => {
  // HPP : ?id=1&id=2 → « 2 » (jamais un tableau inattendu dans un contrôleur)
  for (const [cle, valeur] of Object.entries(req.query || {})) {
    if (Array.isArray(valeur)) req.query[cle] = valeur[valeur.length - 1];
  }
  const raison = inspecter(req.query) || inspecter(req.body);
  if (raison) return refuser(req, res, 400, "REQUETE_INVALIDE", "Requête invalide.", raison);
  next();
};

module.exports = { filtrerUrl, filtrerDonnees, decoderEntierement };
