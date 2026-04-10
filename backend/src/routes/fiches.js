const express = require("express");
const router = express.Router();
const {
  getFiches, getFicheParId, creerFiche, modifierFiche,
  supprimerFiche, mettreAJourFlashcard,
} = require("../controllers/ficheController");
const { proteger } = require("../middleware/auth");

router.use(proteger);

router.get("/", getFiches);
router.get("/:id", getFicheParId);
router.post("/", creerFiche);
router.put("/:id", modifierFiche);
router.delete("/:id", supprimerFiche);
router.put("/:id/flashcard/:flashcardId", mettreAJourFlashcard);

module.exports = router;
