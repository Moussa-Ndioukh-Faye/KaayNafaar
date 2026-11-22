/**
 * Gestion des jetons JWT (OWASP ASVS V3 — gestion de session)
 *
 * - Algorithme imposé (HS256) à la signature ET à la vérification,
 *   pour empêcher toute confusion d'algorithme.
 * - Empreinte du mot de passe (« pwv ») dans le jeton : changer de mot de passe
 *   invalide immédiatement toutes les autres sessions ouvertes.
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

const genererToken = (utilisateur) => {
  const charge = { id: utilisateur.id };
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
const genererJetonUpload = (utilisateur) => {
  const charge = { id: utilisateur.id, portee: PORTEE_UPLOAD };
  const pwv = empreinteMotDePasse(utilisateur.motDePasse);
  if (pwv) charge.pwv = pwv;
  return jwt.sign(charge, process.env.JWT_SECRET, { algorithm: ALGORITHME, expiresIn: "5m" });
};

const verifierToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHME] });

module.exports = { genererToken, genererJetonUpload, verifierToken, empreinteMotDePasse, PORTEE_UPLOAD };
