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

const verifierToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHME] });

module.exports = { genererToken, verifierToken, empreinteMotDePasse };
