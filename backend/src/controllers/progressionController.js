const Progression = require("../models/Progression");

const getProgression = async (req, res) => {
  try {
    let progression = await Progression.findOne({
      where: { utilisateurId: req.utilisateur.id },
    });

    if (!progression) {
      progression = await Progression.create({
        utilisateurId: req.utilisateur.id,
      });
    }

    res.json({ success: true, progression });
  } catch (error) {
    console.error("Erreur getProgression:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer la progression." });
  }
};

const ajouterPlanning = async (req, res) => {
  try {
    const { date, matiere, coursId, dureeMinutes, notes } = req.body;

    let progression = await Progression.findOne({
      where: { utilisateurId: req.utilisateur.id },
    });

    if (!progression) {
      progression = await Progression.create({
        utilisateurId: req.utilisateur.id,
      });
    }

    const planning = progression.planning || [];
    const nouvelleSession = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date(date),
      matiere,
      coursId: coursId || null,
      dureeMinutes: dureeMinutes || 30,
      notes: notes || "",
      estComplete: false,
    };
    planning.push(nouvelleSession);
    await progression.update({ planning });

    res.json({ success: true, planning });
  } catch (error) {
    console.error("Erreur ajouterPlanning:", error);
    res.status(500).json({ success: false, message: "Erreur lors de l'ajout au planning." });
  }
};

const sauvegarderToutLePlanning = async (req, res) => {
  try {
    const { sessions } = req.body; // Array de { date, matiere, sujet, dureeMinutes, priorite }

    if (!Array.isArray(sessions)) {
      return res.status(400).json({ success: false, message: "Liste de sessions invalide." });
    }

    let progression = await Progression.findOne({
      where: { utilisateurId: req.utilisateur.id },
    });

    if (!progression) {
      progression = await Progression.create({
        utilisateurId: req.utilisateur.id,
      });
    }

    const planningActuel = progression.planning || [];
    const nouvellesSessions = sessions.map(s => ({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4),
      date: new Date(s.date),
      matiere: s.matiere || s.sujet || "Révision",
      notes: s.conseils || s.sujet || "",
      dureeMinutes: s.dureeMinutes || 60,
      priorite: s.priorite || "moyenne",
      estComplete: false,
    }));

    const planningMisAJour = [...planningActuel, ...nouvellesSessions];
    await progression.update({ planning: planningMisAJour });

    res.json({ success: true, planning: planningMisAJour });
  } catch (error) {
    console.error("Erreur sauvegarderToutLePlanning:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la sauvegarde du planning complet." });
  }
};

const completerSession = async (req, res) => {
  try {
    const progression = await Progression.findOne({
      where: { utilisateurId: req.utilisateur.id },
    });

    if (!progression) {
      return res.status(404).json({ success: false, message: "Progression introuvable." });
    }

    const planning = progression.planning || [];
    const index = planning.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Session introuvable." });
    }

    planning[index].estComplete = req.body.estComplete ?? true;
    await progression.update({ planning });

    res.json({ success: true, session: planning[index], planning });
  } catch (error) {
    console.error("Erreur completerSession:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la mise à jour de la session." });
  }
};

module.exports = {
  getProgression,
  ajouterPlanning,
  sauvegarderToutLePlanning,
  completerSession,
};
