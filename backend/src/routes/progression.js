const express = require("express");
const router = express.Router();
const {
  getProgression,
  ajouterPlanning,
  sauvegarderToutLePlanning,
  completerSession,
} = require("../controllers/progressionController");
const { proteger } = require("../middleware/auth");

router.use(proteger);

router.get("/", getProgression);
router.post("/planning", ajouterPlanning);
router.post("/planning/bulk", sauvegarderToutLePlanning);
router.put("/planning/:id", completerSession);

module.exports = router;
