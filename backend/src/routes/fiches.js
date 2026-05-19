const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const {
  getFiches, getFicheParId, creerFiche, modifierFiche,
  supprimerFiche, importerFichePublique, mettreAJourFlashcard, getFichesPubliques,
  getFlashcardsDues,
} = require("../controllers/ficheController");
const { proteger } = require("../middleware/auth");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get("/publique", getFichesPubliques); // Liste des fiches publiques
router.get("/partage/:id", getFicheParId); // Détail d'une fiche publique

router.use(proteger);

router.get("/dues", getFlashcardsDues);
router.get("/", getFiches);
router.get("/:id", getFicheParId);
router.post("/", [
  body("titre").trim().isLength({ min: 1, max: 200 }).withMessage("Titre requis (1-200 caractères)"),
  body("contenu").optional().trim(),
  validate,
], creerFiche);
router.put("/:id", [
  body("titre").optional().trim().isLength({ min: 1, max: 200 }).withMessage("Titre invalide (1-200 caractères)"),
  body("contenu").optional().trim(),
  validate,
], modifierFiche);
router.delete("/:id", supprimerFiche);
router.put("/:id/flashcard/:flashcardId", mettreAJourFlashcard);
router.post("/:id/importer", proteger, importerFichePublique);

module.exports = router;
