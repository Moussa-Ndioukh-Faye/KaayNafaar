const express = require("express");
const { param, validationResult } = require("express-validator");
const { proteger } = require("../middleware/auth");
const { limiteurIA } = require("../middleware/securite");
const { quotaIA } = require("../middleware/quotaIA");
const c = require("../controllers/carnetController");

const router = express.Router();

const validate = (req, res, next) => {
  const erreurs = validationResult(req);
  if (!erreurs.isEmpty()) return res.status(400).json({ success: false, message: erreurs.array()[0].msg });
  next();
};
router.use(proteger);

const idValide = param("id").isInt({ min: 1 }).withMessage("Carnet invalide");

router.get("/", c.listerCarnets);
router.post("/", c.creerCarnet);
router.get("/:id", idValide, validate, c.obtenirCarnet);
router.put("/:id", idValide, validate, c.modifierCarnet);
router.delete("/:id", idValide, validate, c.supprimerCarnet);

router.post("/:id/notes", idValide, validate, c.ajouterNote);
router.delete("/:id/notes/:noteId", idValide, param("noteId").isUUID(), validate, c.supprimerNote);

// Appels à l'IA : limite par minute + quota quotidien par étudiant
router.post("/:id/chat", idValide, validate, limiteurIA, quotaIA, c.chatCarnet);
router.post("/:id/studio", idValide, validate, limiteurIA, quotaIA, c.genererStudio);

module.exports = router;
