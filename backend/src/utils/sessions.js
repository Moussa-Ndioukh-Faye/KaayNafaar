/**
 * Gestion des sessions côté serveur (OWASP ASVS V3.3 / V3.5)
 *
 * - Chaque connexion crée une Session ; son identifiant (« sid ») est signé dans le JWT.
 * - Une requête n'est acceptée que si la session existe, appartient à l'utilisateur,
 *   n'est pas révoquée et n'a pas expiré.
 * - Déconnexion = révocation immédiate côté serveur (le jeton volé ne sert plus à rien).
 * - Expiration absolue (7 jours) et expiration après inactivité (3 jours sans activité).
 */

const { Op } = require("sequelize");
const Session = require("../models/Session");

const DUREE_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours (comme le JWT et le cookie)
const INACTIVITE_MAX_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours sans aucune activité
const RAFRAICHIR_ACTIVITE_MS = 5 * 60 * 1000; // on écrit l'activité au plus toutes les 5 min
const SESSIONS_MAX = 10; // au-delà, la plus ancienne est fermée

/** « Safari sur iPhone », « Chrome sur Windows »… à partir du User-Agent (jamais stocké) */
const decrireAppareil = (ua = "") => {
  const s = String(ua).slice(0, 512);
  let systeme = "un appareil inconnu";
  let type = "ordinateur";
  if (/iPhone/i.test(s)) { systeme = "iPhone"; type = "telephone"; }
  else if (/iPad/i.test(s)) { systeme = "iPad"; type = "tablette"; }
  else if (/Android/i.test(s)) {
    const mobile = /Mobile/i.test(s);
    systeme = mobile ? "Android" : "tablette Android";
    type = mobile ? "telephone" : "tablette";
  }
  else if (/CrOS/i.test(s)) systeme = "Chromebook";
  else if (/Windows/i.test(s)) systeme = "Windows";
  else if (/Macintosh|Mac OS X/i.test(s)) systeme = "Mac";
  else if (/Linux/i.test(s)) systeme = "Linux";

  let navigateur = "Navigateur";
  if (/Edg\//i.test(s)) navigateur = "Edge";
  else if (/OPR\/|Opera/i.test(s)) navigateur = "Opera";
  else if (/SamsungBrowser/i.test(s)) navigateur = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(s)) navigateur = "Firefox";
  else if (/CriOS|Chrome\//i.test(s)) navigateur = "Chrome";
  else if (/Safari\//i.test(s)) navigateur = "Safari";

  return { appareil: `${navigateur} sur ${systeme}`, typeAppareil: type };
};

/** IPv4 → 41.82.15.x ; IPv6 → 2001:db8:1::x (on ne garde pas l'adresse complète) */
const tronquerIP = (ip) => {
  if (!ip) return null;
  const brute = String(ip).replace(/^::ffff:/, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(brute)) return brute.split(".").slice(0, 3).join(".") + ".x";
  if (brute.includes(":")) return brute.split(":").slice(0, 3).join(":") + "::x";
  return null;
};

/** Crée la session d'une nouvelle connexion et ferme les plus anciennes au-delà du maximum */
const creerSession = async (req, utilisateur) => {
  const { appareil, typeAppareil } = decrireAppareil(req.get?.("user-agent"));
  const maintenant = new Date();

  // Ménage : sessions expirées ou révoquées depuis plus de 30 jours
  Session.destroy({
    where: {
      utilisateurId: utilisateur.id,
      [Op.or]: [
        { expireLe: { [Op.lt]: new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000) } },
        { revoqueeLe: { [Op.lt]: new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      ],
    },
  }).catch(() => {});

  const session = await Session.create({
    utilisateurId: utilisateur.id,
    appareil,
    typeAppareil,
    ipTronquee: tronquerIP(req.ip),
    derniereActivite: maintenant,
    expireLe: new Date(maintenant.getTime() + DUREE_SESSION_MS),
  });

  // Trop de sessions ouvertes : on ferme les plus anciennes
  const actives = await Session.findAll({
    where: { utilisateurId: utilisateur.id, revoqueeLe: null, expireLe: { [Op.gt]: maintenant } },
    order: [["derniereActivite", "DESC"]],
    attributes: ["id"],
  });
  // La session qu'on vient d'ouvrir n'est jamais fermée ; on garde les plus récentes
  const autres = (actives || []).filter((s) => s.id !== session.id);
  const enTrop = autres.slice(SESSIONS_MAX - 1).map((s) => s.id);
  if (enTrop.length) {
    await Session.update({ revoqueeLe: maintenant }, { where: { id: enTrop } });
  }

  return session;
};

/**
 * Vérifie la session d'un jeton. Renvoie la session si elle est valable, sinon null.
 * Met à jour la dernière activité (au plus toutes les 5 minutes).
 */
const verifierSession = async (sid, utilisateurId) => {
  if (!sid || typeof sid !== "string") return null;
  const session = await Session.findOne({ where: { id: sid, utilisateurId } });
  if (!session || session.revoqueeLe) return null;

  const maintenant = Date.now();
  if (new Date(session.expireLe).getTime() <= maintenant) return null;
  if (maintenant - new Date(session.derniereActivite).getTime() > INACTIVITE_MAX_MS) {
    session.update({ revoqueeLe: new Date() }).catch(() => {});
    return null;
  }
  if (maintenant - new Date(session.derniereActivite).getTime() > RAFRAICHIR_ACTIVITE_MS) {
    session.update({ derniereActivite: new Date() }).catch(() => {});
  }
  return session;
};

/** Révoque une session précise (si elle appartient bien à l'utilisateur) */
const revoquerSession = async (sid, utilisateurId) => {
  if (!sid) return 0;
  const [n] = await Session.update(
    { revoqueeLe: new Date() },
    { where: { id: sid, utilisateurId, revoqueeLe: null } }
  );
  return n;
};

/** Révoque toutes les sessions de l'utilisateur, sauf éventuellement la session courante */
const revoquerToutes = async (utilisateurId, saufSid = null) => {
  const where = { utilisateurId, revoqueeLe: null };
  if (saufSid) where.id = { [Op.ne]: saufSid };
  const [n] = await Session.update({ revoqueeLe: new Date() }, { where });
  return n;
};

/** Sessions actives, pour l'écran « Appareils connectés » */
const listerSessions = async (utilisateurId) => {
  const sessions = await Session.findAll({
    where: { utilisateurId, revoqueeLe: null, expireLe: { [Op.gt]: new Date() } },
    order: [["derniereActivite", "DESC"]],
    attributes: ["id", "appareil", "typeAppareil", "ipTronquee", "derniereActivite", "createdAt", "expireLe"],
  });
  const limite = Date.now() - INACTIVITE_MAX_MS;
  return (sessions || []).filter((s) => new Date(s.derniereActivite).getTime() > limite);
};

module.exports = {
  creerSession,
  verifierSession,
  revoquerSession,
  revoquerToutes,
  listerSessions,
  decrireAppareil,
  tronquerIP,
  DUREE_SESSION_MS,
  INACTIVITE_MAX_MS,
};
