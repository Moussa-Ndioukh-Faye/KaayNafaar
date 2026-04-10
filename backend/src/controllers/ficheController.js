/**
 * Contrôleur des Fiches de révision
 */

const Fiche = require("../models/Fiche");
const Progression = require("../models/Progression");

// GET /api/fiches
const getFiches = async (req, res) => {
  try {
    const { matiere, coursId } = req.query;
    const filtre = { utilisateur: req.utilisateur._id };
    if (matiere) filtre.matiere = matiere;
    if (coursId) filtre.cours = coursId;

    const fiches = await Fiche.find(filtre)
      .populate("cours", "titre matiere")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: fiches.length, fiches });
  } catch (error) {
    console.error("Erreur getFiches:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer les fiches." });
  }
};

// GET /api/fiches/:id
const getFicheParId = async (req, res) => {
  try {
    const fiche = await Fiche.findOne({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    }).populate("cours", "titre matiere");

    if (!fiche) {
      return res
        .status(404)
        .json({ success: false, message: "Fiche introuvable." });
    }

    res.json({ success: true, fiche });
  } catch (error) {
    console.error("Erreur getFicheParId:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer cette fiche." });
  }
};

// POST /api/fiches
const creerFiche = async (req, res) => {
  try {
    const { titre, matiere, contenu, flashcards, coursId, couleur } = req.body;

    const fiche = await Fiche.create({
      titre,
      matiere,
      contenu,
      flashcards: flashcards || [],
      cours: coursId || null,
      couleur: couleur || "#6366f1",
      utilisateur: req.utilisateur._id,
      genereeParIA: false,
    });

    await Progression.findOneAndUpdate(
      { utilisateur: req.utilisateur._id },
      { $inc: { "stats.fichesTotal": 1 } }
    );

    res.status(201).json({ success: true, fiche });
  } catch (error) {
    console.error("Erreur creerFiche:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la création de la fiche." });
  }
};

// PUT /api/fiches/:id
const modifierFiche = async (req, res) => {
  try {
    // Whitelist des champs modifiables — évite l'injection de champs sensibles (utilisateur, _id...)
    const { titre, matiere, contenu, flashcards, couleur } = req.body;
    const miseAJour = {};
    if (titre !== undefined) miseAJour.titre = titre;
    if (matiere !== undefined) miseAJour.matiere = matiere;
    if (contenu !== undefined) miseAJour.contenu = contenu;
    if (flashcards !== undefined) miseAJour.flashcards = flashcards;
    if (couleur !== undefined) miseAJour.couleur = couleur;

    const fiche = await Fiche.findOneAndUpdate(
      { _id: req.params.id, utilisateur: req.utilisateur._id },
      miseAJour,
      { new: true, runValidators: true }
    );

    if (!fiche) {
      return res
        .status(404)
        .json({ success: false, message: "Fiche introuvable." });
    }

    res.json({ success: true, fiche });
  } catch (error) {
    console.error("Erreur modifierFiche:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la modification de la fiche." });
  }
};

// DELETE /api/fiches/:id
const supprimerFiche = async (req, res) => {
  try {
    const fiche = await Fiche.findOneAndDelete({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    });

    if (!fiche) {
      return res
        .status(404)
        .json({ success: false, message: "Fiche introuvable." });
    }

    res.json({ success: true, message: "Fiche supprimée." });
  } catch (error) {
    console.error("Erreur supprimerFiche:", error);
    res.status(500).json({ success: false, message: "Impossible de supprimer cette fiche." });
  }
};

// PUT /api/fiches/:id/flashcard/:flashcardId — Mettre à jour le niveau de maîtrise d'une flashcard
const mettreAJourFlashcard = async (req, res) => {
  try {
    const niveauMaitrise = parseInt(req.body.niveauMaitrise);
    if (isNaN(niveauMaitrise) || niveauMaitrise < 0 || niveauMaitrise > 5) {
      return res.status(400).json({ success: false, message: "niveauMaitrise doit être un entier entre 0 et 5." });
    }

    const fiche = await Fiche.findOne({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    });

    if (!fiche) {
      return res.status(404).json({ success: false, message: "Fiche introuvable." });
    }

    const flashcard = fiche.flashcards.id(req.params.flashcardId);
    if (!flashcard) {
      return res.status(404).json({ success: false, message: "Flashcard introuvable." });
    }

    flashcard.niveauMaitrise = niveauMaitrise;
    // Algorithme de répétition espacée simplifié
    const joursAvant = Math.pow(2, niveauMaitrise);
    flashcard.prochaineRevision = new Date(Date.now() + joursAvant * 86400000);

    await fiche.save();
    res.json({ success: true, flashcard });
  } catch (error) {
    console.error("Erreur mettreAJourFlashcard:", error);
    res.status(500).json({ success: false, message: "Impossible de mettre à jour la flashcard." });
  }
};

module.exports = {
  getFiches,
  getFicheParId,
  creerFiche,
  modifierFiche,
  supprimerFiche,
  mettreAJourFlashcard,
};
