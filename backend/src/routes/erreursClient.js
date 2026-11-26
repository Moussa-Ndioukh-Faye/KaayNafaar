/**
 * POST /api/erreurs-client — l'application signale un plantage d'écran ou une erreur inattendue,
 * pour qu'elle apparaisse dans les logs du serveur (sinon elle resterait invisible).
 * Pas de compte requis ; limité en nombre ; textes tronqués ; ni adresse complète ni données saisies.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const limiteur = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(204).end(), // silencieux : l'application n'a rien à afficher
});

const propre = (v, max) =>
  String(v ?? "")
    .replace(/[\r\n\t]+/g, " ")
    // Ne jamais journaliser un jeton ou une adresse email qui traînerait dans un message
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g, "[jeton]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .slice(0, max);

router.post("/", limiteur, (req, res) => {
  const { type, message, pile, page, version } = req.body || {};
  if (!message || typeof message !== "string") return res.status(204).end();
  const chemin = propre(String(page || "").split(/[?#]/)[0], 120);
  console.warn(
    `🧩 [client ${req.id}] ${propre(type, 30) || "erreur"} sur ${chemin || "?"} (v${propre(version, 20) || "?"}) : ${propre(message, 300)}` +
      (pile ? `\n   ${propre(pile, 1500)}` : "")
  );
  res.status(204).end();
});

module.exports = router;
