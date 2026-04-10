const express = require("express");
const router = express.Router();
const {
  genererFiche, genererQuiz, expliquerConcept, genererPlanning, chat,
} = require("../controllers/aiController");
const { proteger } = require("../middleware/auth");

router.use(proteger);

router.post("/generer-fiche", genererFiche);
router.post("/generer-quiz", genererQuiz);
router.post("/expliquer", expliquerConcept);
router.post("/planning", genererPlanning);
router.post("/chat", chat);

module.exports = router;
