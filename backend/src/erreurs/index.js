/**
 * Gestion des erreurs du serveur — un seul endroit pour :
 *  - les erreurs « métier » volontaires (ErreurApp : statut, code, message pour l'étudiant) ;
 *  - la traduction des erreurs techniques (base de données, JSON, envoi de fichier, IA)
 *    en réponses claires, sans jamais exposer de détail interne (OWASP A05/A09) ;
 *  - la référence de requête, affichée à l'étudiant et écrite dans les logs, pour retrouver
 *    une erreur précise quand quelqu'un la signale.
 */

class ErreurApp extends Error {
  /**
   * @param {number} status code HTTP
   * @param {string} message message affichable à l'étudiant (en français)
   * @param {string} [code] code stable pour l'application (ex. COURS_INTROUVABLE)
   * @param {object} [details] détails affichables (ex. champs invalides)
   */
  constructor(status, message, code, details) {
    super(message);
    this.name = "ErreurApp";
    this.status = status;
    this.code = code || CODES_PAR_STATUT[status] || "ERREUR";
    this.details = details;
    this.expose = true;
  }
}

const CODES_PAR_STATUT = {
  400: "REQUETE_INVALIDE",
  401: "NON_AUTHENTIFIE",
  403: "INTERDIT",
  404: "INTROUVABLE",
  409: "CONFLIT",
  413: "TROP_VOLUMINEUX",
  415: "TYPE_NON_SUPPORTE",
  422: "DONNEES_INVALIDES",
  429: "TROP_DE_REQUETES",
  500: "ERREUR_INTERNE",
  503: "SERVICE_INDISPONIBLE",
  504: "DELAI_DEPASSE",
};

const raccourcis = {
  requeteInvalide: (m = "Requête invalide.", details) => new ErreurApp(400, m, "REQUETE_INVALIDE", details),
  introuvable: (m = "Élément introuvable.", code = "INTROUVABLE") => new ErreurApp(404, m, code),
  interdit: (m = "Action non autorisée.") => new ErreurApp(403, m, "INTERDIT"),
  conflit: (m = "Cet élément existe déjà.") => new ErreurApp(409, m, "CONFLIT"),
  indisponible: (m = "Service momentanément indisponible. Réessaie dans un instant.") =>
    new ErreurApp(503, m, "SERVICE_INDISPONIBLE"),
};

/**
 * Transforme n'importe quelle erreur en { status, code, message, details?, grave }.
 * `grave` = erreur du serveur (5xx) : journalisée avec sa pile, message générique côté client.
 */
const traduireErreur = (err) => {
  if (err instanceof ErreurApp) {
    return { status: err.status, code: err.code, message: err.message, details: err.details, grave: err.status >= 500 };
  }

  // Corps JSON mal formé (express.json)
  if (err.type === "entity.parse.failed") {
    return { status: 400, code: "JSON_INVALIDE", message: "Les données envoyées sont mal formées." };
  }
  if (err.type === "entity.too.large") {
    return { status: 413, code: "TROP_VOLUMINEUX", message: "Requête trop volumineuse." };
  }

  // Envoi de fichier (multer, contrôle de type)
  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Fichier trop volumineux."
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Champ de fichier inattendu."
          : "Envoi du fichier impossible.";
    return { status: err.code === "LIMIT_FILE_SIZE" ? 413 : 400, code: "FICHIER_INVALIDE", message };
  }
  if (err.code === "TYPE_FICHIER_INVALIDE") {
    return { status: 415, code: "TYPE_NON_SUPPORTE", message: err.message || "Type de fichier non pris en charge." };
  }

  // Base de données (Sequelize)
  switch (err.name) {
    case "SequelizeValidationError":
      return {
        status: 400,
        code: "DONNEES_INVALIDES",
        message: "Certaines informations sont invalides.",
        details: (err.errors || []).map((e) => ({ champ: e.path, message: e.message })).slice(0, 10),
      };
    case "SequelizeUniqueConstraintError":
      return { status: 409, code: "CONFLIT", message: "Cet élément existe déjà." };
    case "SequelizeForeignKeyConstraintError":
      return { status: 400, code: "REFERENCE_INVALIDE", message: "Un élément lié est introuvable." };
    case "SequelizeConnectionError":
    case "SequelizeConnectionRefusedError":
    case "SequelizeConnectionTimedOutError":
    case "SequelizeConnectionAcquireTimeoutError":
    case "SequelizeHostNotReachableError":
    case "SequelizeHostNotFoundError":
      return { status: 503, code: "BASE_INDISPONIBLE", message: "Le service est momentanément indisponible. Réessaie dans un instant.", grave: true };
    case "SequelizeDatabaseError":
      return { status: 500, code: "ERREUR_INTERNE", message: "Erreur interne du serveur.", grave: true };
    default:
  }

  // Services d'IA (voir aiProviderManager) : le message est déjà rédigé pour l'étudiant
  if (err.name === "ErreurIA") {
    return { status: 503, code: "IA_INDISPONIBLE", message: err.message, grave: false };
  }

  // Origine refusée par CORS
  if (err.message === "Origine non autorisée par CORS") {
    return { status: 403, code: "ORIGINE_REFUSEE", message: "Origine non autorisée." };
  }

  // Erreurs HTTP « exposables » (http-errors, body-parser…) : statut 4xx avec message sûr
  const statut = Number(err.status || err.statusCode);
  if (statut >= 400 && statut < 500) {
    return { status: statut, code: CODES_PAR_STATUT[statut] || "REQUETE_INVALIDE", message: err.expose ? err.message : "Requête invalide." };
  }

  return { status: 500, code: "ERREUR_INTERNE", message: "Erreur interne du serveur.", grave: true };
};

module.exports = { ErreurApp, traduireErreur, CODES_PAR_STATUT, ...raccourcis };
