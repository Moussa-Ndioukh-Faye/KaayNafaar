/**
 * Journal de sécurité (OWASP A09 — Security Logging and Monitoring Failures)
 *
 * - Chaque événement sensible est écrit sur une ligne JSON (lisible dans les logs Render).
 * - Les adresses email sont masquées (RGPD : minimisation des données).
 * - Détection d'activité suspecte : au-delà de SEUIL échecs de connexion en
 *   FENETRE_MS depuis une même IP ou sur un même compte, une alerte est levée
 *   (log « warn » + email à SECURITY_ALERT_EMAIL si configuré, au plus une par 15 min).
 */

const FENETRE_MS = parseInt(process.env.SUSPICION_FENETRE_MS || "60000", 10);
const SEUIL = parseInt(process.env.SUSPICION_SEUIL || "5", 10);
const DELAI_ENTRE_ALERTES_MS = 15 * 60 * 1000;
const TAILLE_MAX = 10000; // borne mémoire

const echecs = new Map(); // clé -> [horodatages]
const dernieresAlertes = new Map(); // clé -> horodatage
let derniereAlerteEmail = 0;

const masquerEmail = (email) => {
  const [local, domaine] = String(email || "").toLowerCase().trim().split("@");
  if (!domaine) return "inconnu";
  return `${local.slice(0, 2)}***@${domaine}`;
};

const journaliser = (evenement, req, details = {}, niveau = "info") => {
  if (process.env.NODE_ENV === "test" && !process.env.JOURNAL_EN_TEST) return;
  const ligne = JSON.stringify({
    type: "securite",
    evenement,
    date: new Date().toISOString(),
    ip: req?.ip,
    methode: req?.method,
    chemin: req?.path,
    ...details,
  });
  if (niveau === "warn") console.warn(ligne);
  else console.log(ligne);
};

const nettoyer = (maintenant) => {
  for (const [cle, liste] of echecs) {
    const recents = liste.filter((t) => maintenant - t < FENETRE_MS);
    if (recents.length) echecs.set(cle, recents);
    else echecs.delete(cle);
  }
  for (const [cle, t] of dernieresAlertes) {
    if (maintenant - t > DELAI_ENTRE_ALERTES_MS) dernieresAlertes.delete(cle);
  }
};

const enregistrer = (cle, maintenant) => {
  if (echecs.size > TAILLE_MAX) nettoyer(maintenant);
  const recents = (echecs.get(cle) || []).filter((t) => maintenant - t < FENETRE_MS);
  recents.push(maintenant);
  echecs.set(cle, recents);
  return recents.length;
};

const alerterParEmail = (message) => {
  const destinataire = process.env.SECURITY_ALERT_EMAIL;
  if (!destinataire || Date.now() - derniereAlerteEmail < DELAI_ENTRE_ALERTES_MS) return;
  derniereAlerteEmail = Date.now();
  // Chargement tardif : évite une dépendance circulaire avec utils/email
  const { envoyerEmail } = require("./email");
  envoyerEmail({
    destinataire,
    sujet: "⚠️ Activité suspecte — Kaay Nafaar",
    texte: message,
    html: `<p>${message.replace(/[<>&]/g, "")}</p>`,
  }).catch((err) => console.error("Alerte sécurité non envoyée:", err.message));
};

/**
 * Enregistre un échec de connexion et lève une alerte si le seuil est franchi.
 * @returns {boolean} true si l'activité est jugée suspecte
 */
const signalerEchecConnexion = (req, email, raison = "identifiants") => {
  const maintenant = Date.now();
  const emailMasque = masquerEmail(email);
  journaliser("connexion.echec", req, { email: emailMasque, raison });

  const parIP = enregistrer(`ip:${req.ip}`, maintenant);
  const parCompte = enregistrer(`compte:${String(email).toLowerCase().trim()}`, maintenant);
  const total = Math.max(parIP, parCompte);
  if (total < SEUIL) return false;

  const cle = parIP >= SEUIL ? `ip:${req.ip}` : `compte:${emailMasque}`;
  if (!dernieresAlertes.has(cle)) {
    dernieresAlertes.set(cle, maintenant);
    journaliser(
      "activite.suspecte",
      req,
      { email: emailMasque, echecs: total, fenetreSecondes: FENETRE_MS / 1000, cible: cle.split(":")[0] },
      "warn"
    );
    alerterParEmail(
      `${total} échecs de connexion en moins de ${FENETRE_MS / 1000} s ` +
        `(IP ${req.ip}, compte ${emailMasque}) à ${new Date().toISOString()}.`
    );
  }
  return true;
};

/** Réservé aux tests */
const _reinitialiser = () => {
  echecs.clear();
  dernieresAlertes.clear();
  derniereAlerteEmail = 0;
};

module.exports = { journaliser, signalerEchecConnexion, masquerEmail, SEUIL, _reinitialiser };
