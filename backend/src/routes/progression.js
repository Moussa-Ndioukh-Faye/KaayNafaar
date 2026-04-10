const express = require("express");
const router = express.Router();
const Progression = require("../models/Progression");
const { proteger } = require("../middleware/auth");

router.use(proteger);

// GET /api/progression — Récupérer la progression de l'utilisateur
router.get("/", async (req, res) => {
  try {
    const progression = await Progression.findOne({
      utilisateur: req.utilisateur._id,
    }).populate("planning.cours", "titre matiere");

    if (!progression) {
      return res.status(404).json({ success: false, message: "Progression introuvable." });
    }

    res.json({ success: true, progression });
  } catch (error) {
    console.error("Erreur getProgression:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer la progression." });
  }
});

// POST /api/progression/planning — Ajouter une session au planning
router.post("/planning", async (req, res) => {
  try {
    const { date, matiere, coursId, dureeMinutes, notes } = req.body;

    const progression = await Progression.findOneAndUpdate(
      { utilisateur: req.utilisateur._id },
      {
        $push: {
          planning: {
            date: new Date(date),
            matiere,
            cours: coursId || null,
            dureeMinutes: dureeMinutes || 30,
            notes: notes || "",
          },
        },
      },
      { new: true }
    );

    res.json({ success: true, planning: progression.planning });
  } catch (error) {
    console.error("Erreur ajouterPlanning:", error);
    res.status(500).json({ success: false, message: "Erreur lors de l'ajout au planning." });
  }
});

// PUT /api/progression/planning/:id — Marquer une session comme complète
router.put("/planning/:id", async (req, res) => {
  try {
    const progression = await Progression.findOne({
      utilisateur: req.utilisateur._id,
    });

    const session = progression.planning.id(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session introuvable." });
    }

    session.estComplete = req.body.estComplete ?? true;
    await progression.save();

    res.json({ success: true, session });
  } catch (error) {
    console.error("Erreur completerSession:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la mise à jour de la session." });
  }
});

module.exports = router;
