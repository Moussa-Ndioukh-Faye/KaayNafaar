/**
 * Gestion des jetons JWT (OWASP ASVS V3 — gestion de session)
 *
 * - Algorithme imposé (HS256) à la signature ET à la vérification,
 *   pour empêcher toute confusion d'algorithme.
 * - Empreinte du mot de passe (« pwv ») dans le jeton : changer de mot de passe
 *   invalide immédiatement toutes les autres sessions ouvertes.
 * - Identifiant de session (« sid ») : la session est vérifiée et révocable côté serveur.
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ALGORITHME = "HS256";

// Empreinte courte et non réversible du hash bcrypt (jamais le hash lui-même)
const empreinteMotDePasse = (hashMotDePasse) => {
  if (!hashMotDePasse) return null;
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(String(hashMotDePasse))
    .digest("base64url")
    .slice(0, 16);
};

const genererToken = (utilisateur, sid) => {
  const charge = { id: utilisateur.id, sid };
  const pwv = empreinteMotDePasse(utilisateur.motDePasse);
  if (pwv) charge.pwv = pwv;
  return jwt.sign(charge, process.env.JWT_SECRET, {
    algorithm: ALGORITHME,
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Jeton à portée limitée et très courte durée, utilisé uniquement pour envoyer
// un fichier directement au serveur (le proxy Vercel limite la taille des requêtes).
// Le jeton de session, lui, ne quitte jamais le cookie httpOnly.
const PORTEE_UPLOAD = "upload";
// Jetons « upload » déjà utilisés : chacun ne sert qu'une fois (un jeton intercepté est inutile)
const jetonsUtilises = new Map(); // jti → expiration (ms)
const consommerJetonUpload = (decoded) => {
  const maintenant = Date.now();
  for (const [jti, exp] of jetonsUtilises) if (exp < maintenant) jetonsUtilises.delete(jti);
  if (!decoded.jti || jetonsUtilises.has(decoded.jti)) return false;
  jetonsUtilises.set(decoded.jti, (decoded.exp || 0) * 1000 || maintenant + 5 * 60 * 1000);
  return true;
};

const genererJetonUpload = (utilisateur, sid) => {
  const charge = { id: utilisateur.id, sid, portee: PORTEE_UPLOAD, jti: crypto.randomUUID() };
  const pwv = empreinteMotDePasse(utilisateur.motDePasse);
  if (pwv) charge.pwv = pwv;
  return jwt.sign(charge, process.env.JWT_SECRET, { algorithm: ALGORITHME, expiresIn: "5m" });
};

const verifierToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHME] });

module.exports = { genererToken, genererJetonUpload, consommerJetonUpload, verifierToken, empreinteMotDePasse, PORTEE_UPLOAD };
