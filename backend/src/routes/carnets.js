const express = require("express");
const { param, validationResult } = require("express-validator");
const { proteger } = require("../middleware/auth");
const { limiteurIA } = require("../middleware/securite");
const { quotaIA, quotaImports } = require("../middleware/quotaIA");
const gestion = require("../controllers/carnetController");
const chat = require("../controllers/carnetChatController");
const studio = require("../controllers/carnetStudioController");

const router = express.Router();

const validate = (req, res, next) => {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) return res.status(400).json({ success: false, message: erreurs.array()[0].msg });
  next();
};
router.use(proteger);

const idValide = [param("id").isInt({ min: 1 }).withMessage("Carnet invalide"), validate];
const productionValide = [param("pid").isInt({ min: 1 }).withMessage("Production invalide"), validate];
const noteValide = [param("noteId").isUUID().withMessage("Note invalide"), validate];
// Appels à l'IA : limite par minute + quota quotidien par étudiant
const ia = [limiteurIA, quotaIA];

// Carnets et réglages
router.get("/", gestion.listerCarnets);
router.post("/", gestion.creerCarnet);
router.get("/:id", idValide, gestion.obtenirCarnet);
router.put("/:id", idValide, gestion.modifierCarnet);
router.delete("/:id", idValide, gestion.supprimerCarnet);
router.put("/:id/reglages", idValide, gestion.modifierReglages);

// Notes
router.post("/:id/notes", idValide, gestion.ajouterNote);
router.delete("/:id/notes/:noteId", idValide, noteValide, gestion.supprimerNote);
router.post("/:id/notes/:noteId/source", idValide, noteValide, quotaImports, gestion.noteEnSource);

// Découverte de sources sur le web
router.post("/:id/decouvrir", idValide, ...ia, gestion.decouvrirSources);
router.post("/:id/sources/web", idValide, quotaImports, gestion.ajouterSourcesWeb);

// Guide (mis en cache : seulement limité par minute) et chat
router.get("/:id/guide", idValide, limiteurIA, chat.guideCarnet);
router.get("/:id/messages", idValide, chat.listerMessages);
router.delete("/:id/messages", idValide, chat.effacerMessages);
router.post("/:id/chat", idValide, ...ia, chat.chatCarnet);

// Studio
router.post("/:id/studio", idValide, ...ia, studio.genererProduction);
router.delete("/:id/productions/:pid", idValide, productionValide, studio.supprimerProduction);
router.post("/:id/productions/:pid/exporter", idValide, productionValide, studio.exporterProduction);
router.post("/:id/productions/:pid/intervention", idValide, productionValide, ...ia, studio.intervenirAudio);

module.exports = router;
