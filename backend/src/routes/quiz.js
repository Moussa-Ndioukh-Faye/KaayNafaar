const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const {
  getQuiz, getQuizParId, creerQuiz, soumettreSession, supprimerQuiz,
} = require("../controllers/quizController");
const { proteger } = require("../middleware/auth");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get("/partage/:id", getQuizParId); // Route publique

router.use(proteger);

router.get("/", getQuiz);
router.get("/:id", getQuizParId);
router.post("/", [
  body("titre").trim().isLength({ min: 1, max: 200 }).withMessage("Titre requis (1-200 caractères)"),
  body("questions").isArray({ min: 1 }).withMessage("Au moins 1 question requise"),
  validate,
], creerQuiz);
router.post("/:id/session", soumettreSession);
router.delete("/:id", supprimerQuiz);

module.exports = router;
