const express = require("express");
const router = express.Router();
const {
  getQuiz, getQuizParId, creerQuiz, soumettreSession, supprimerQuiz,
} = require("../controllers/quizController");
const { proteger } = require("../middleware/auth");

router.use(proteger);

router.get("/", getQuiz);
router.get("/:id", getQuizParId);
router.post("/", creerQuiz);
router.post("/:id/session", soumettreSession);
router.delete("/:id", supprimerQuiz);

module.exports = router;
