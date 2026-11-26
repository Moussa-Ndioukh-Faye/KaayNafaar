/* global __APP_VERSION__ */
/**
 * Erreurs côté application — un seul endroit pour :
 *  - transformer n'importe quelle erreur (réseau, délai, serveur, IA) en message clair en français ;
 *  - retrouver la référence renvoyée par le serveur, à communiquer en cas de signalement ;
 *  - signaler au serveur les erreurs inattendues (écran planté), sinon invisibles.
 */

const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/** Référence de l'erreur (corps de la réponse ou en-tête X-Request-Id) */
export const referenceErreur = (err) =>
  err?.response?.data?.reference || err?.response?.headers?.["x-request-id"] || err?.reference || null;

/** Code stable renvoyé par le serveur (ex. SESSION_REVOQUEE, IA_INDISPONIBLE) */
export const codeErreur = (err) => err?.response?.data?.code || err?.code || null;

const enLigne = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);

const delaiAttente = (err) => {
  const brut = err?.response?.headers?.["retry-after"];
  const secondes = Number.parseInt(brut, 10);
  if (!Number.isFinite(secondes) || secondes <= 0) return null;
  return secondes < 90 ? `${secondes} secondes` : `${Math.ceil(secondes / 60)} minutes`;
};

/**
 * Message à afficher à l'étudiant.
 * @param {unknown} err erreur axios, fetch ou JavaScript
 * @param {string} [defaut] message propre à l'action (« Impossible de créer le carnet. »)
 * @param {{ reference?: boolean }} [options] reference : ajouter « (réf. XXXX-XXXX) » aux erreurs serveur
 */
export const messageErreur = (err, defaut = "Une erreur est survenue. Réessaie.", { reference = true } = {}) => {
  if (!err) return defaut;
  if (typeof err === "string") return err;

  // Annulation volontaire (changement de page, arrêt d'une génération) : rien à dire
  if (err.name === "CanceledError" || err.name === "AbortError" || err.code === "ERR_CANCELED") return "";

  const statut = err.response?.status;
  const donnees = err.response?.data;
  const messageServeur =
    (typeof donnees?.message === "string" && donnees.message) || donnees?.errors?.[0]?.msg || donnees?.details?.[0]?.message || "";
  const ref = reference && referenceErreur(err);
  const avecRef = (m) => (ref ? `${m} (réf. ${ref})` : m);

  // Pas de réponse du serveur
  if (!err.response) {
    if (!enLigne()) return "Tu es hors ligne. Vérifie ta connexion internet puis réessaie.";
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT" || /timeout/i.test(err.message || "")) {
      return "Le serveur met trop de temps à répondre. Réessaie dans un instant.";
    }
    if (err.code === "ERR_NETWORK" || /network|failed to fetch|load failed/i.test(err.message || "")) {
      return "Impossible de joindre le serveur. Vérifie ta connexion ou réessaie dans un instant.";
    }
    return defaut;
  }

  switch (statut) {
    case 400:
    case 409:
    case 415:
    case 422:
      return messageServeur || defaut;
    case 401:
      return messageServeur || "Ta session a expiré. Reconnecte-toi.";
    case 403:
      return messageServeur || "Tu n'as pas accès à cette action.";
    case 404:
      return messageServeur && messageServeur !== "Route introuvable." ? messageServeur : "Élément introuvable : il a peut-être été supprimé.";
    case 413:
      return "Fichier ou contenu trop volumineux.";
    case 429: {
      const attente = delaiAttente(err);
      return messageServeur || (attente ? `Trop de demandes. Réessaie dans ${attente}.` : "Trop de demandes. Patiente un peu puis réessaie.");
    }
    case 503:
      // Le serveur rédige déjà un message utile pour l'IA indisponible
      return avecRef(codeErreur(err) === "IA_INDISPONIBLE" && messageServeur ? messageServeur : "Service momentanément indisponible. Réessaie dans un instant.");
    case 502:
    case 504:
      return avecRef("Le serveur redémarre ou est surchargé. Réessaie dans une minute.");
    default:
      if (statut >= 500) return avecRef(defaut);
      return messageServeur || defaut;
  }
};

/** Erreur qui vaut la peine d'un nouvel essai automatique ou d'un bouton « Réessayer » */
export const estTemporaire = (err) => {
  const statut = err?.response?.status;
  return !err?.response || statut === 408 || statut === 429 || statut >= 500;
};

/** Le chargement d'un morceau de l'application a échoué (souvent : nouvelle version déployée) */
export const estErreurChargement = (err) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed|Unable to preload CSS/i.test(
    String(err?.message || err)
  );

/* ── Signalement au serveur ─────────────────────────────────────── */

const dejaSignalees = new Set();
let signalements = 0;

/**
 * Envoie une erreur inattendue au serveur (logs). Sans effet en test et en développement,
 * dédoublonnée, limitée à 10 par visite, et sans aucune donnée saisie par l'étudiant.
 */
export const signalerErreur = (err, type = "erreur") => {
  try {
    if (import.meta.env.MODE === "test" || import.meta.env.DEV) return;
    const message = String(err?.message || err || "").slice(0, 300);
    if (!message || estErreurChargement(err)) return;
    const cle = `${type}:${message}`;
    if (dejaSignalees.has(cle) || signalements >= 10) return;
    dejaSignalees.add(cle);
    signalements += 1;
    const corps = JSON.stringify({
      type,
      message,
      pile: String(err?.stack || "").slice(0, 1500),
      page: window.location.pathname,
      version: VERSION,
    });
    const blob = new Blob([corps], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/erreurs-client", blob)) {
      fetch("/api/erreurs-client", { method: "POST", body: corps, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch (_) {
    /* le signalement ne doit jamais provoquer d'erreur */
  }
};

/** Écoute les erreurs qui échappent à React (scripts, promesses oubliées) */
export const installerSignalementGlobal = () => {
  if (typeof window === "undefined" || window.__signalementInstalle) return;
  window.__signalementInstalle = true;
  window.addEventListener("error", (e) => signalerErreur(e.error || e.message, "script"));
  window.addEventListener("unhandledrejection", (e) => {
    // Les erreurs d'API sont déjà affichées à l'endroit où elles se produisent
    if (e.reason?.isAxiosError) return;
    signalerErreur(e.reason, "promesse");
  });
};
