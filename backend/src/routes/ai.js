const express = require("express");
const router = express.Router();
const {
  genererFiche, genererQuiz, expliquerConcept, genererPlanning, chat, feedback, getFeedbacks,
} = require("../controllers/aiController");
const { proteger } = require("../middleware/auth");
const { quotaIA } = require("../middleware/quotaIA");

router.use(proteger);

router.post("/generer-fiche", quotaIA, genererFiche);
router.post("/generer-quiz", quotaIA, genererQuiz);
router.post("/expliquer", quotaIA, expliquerConcept);
router.post("/planning", quotaIA, genererPlanning);
router.post("/chat", quotaIA, chat);
router.post("/feedback", feedback);
router.get("/feedbacks", getFeedbacks);

module.exports = router;
