/**
 * Contrôleur des Fiches de révision
 */

const Fiche = require("../models/Fiche");
const Course = require("../models/Course");
const Progression = require("../models/Progression");
const { Op } = require("sequelize");

const inclureCours = {
  model: Course,
  as: "cours",
  attributes: ["id", "titre", "matiere"],
  required: false,
};

const formaterFiche = (fiche) => {
  if (!fiche) return null;
  const data = fiche.toJSON ? fiche.toJSON() : fiche;
  return {
    ...data,
    contenu: {
      resume: data.resume || "",
      conceptsCles: data.conceptsCles || [],
      explications: data.explications || {},
      pointsImportants: data.pointsImportants || [],
    },
  };
};

// GET /api/fiches
const getFiches = async (req, res) => {
  try {
    const { matiere, coursId } = req.query;
    const where = { utilisateurId: req.utilisateur.id };
    if (matiere) where.matiere = matiere;
    if (coursId) where.coursId = coursId;

    const fiches = await Fiche.findAll({
      where,
      include: [inclureCours],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: fiches.length, fiches: fiches.map(formaterFiche) });
  } catch (error) {
    console.error("Erreur getFiches:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer les fiches." });
  }
};

// GET /api/fiches/:id
const getFicheParId = async (req, res) => {
  try {
    const userId = req.utilisateur?.id; // Peut être undefined si route publique
    
    const where = { id: req.params.id };
    
    // Si pas de userId, on ne cherche que les fiches publiques
    if (!userId) {
      where.estPublique = true;
    } else {
      // Si userId, on cherche soit la fiche de l'utilisateur, soit une fiche publique
      where[Op.or] = [
        { utilisateurId: userId },
        { estPublique: true }
      ];
    }

    const fiche = await Fiche.findOne({
      where,
      include: [inclureCours],
    });

    if (!fiche) {
      return res.status(404).json({ success: false, message: "Fiche introuvable ou privée." });
    }

    res.json({ success: true, fiche: formaterFiche(fiche) });
  } catch (error) {
    console.error("Erreur getFicheParId:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer cette fiche." });
  }
};

// POST /api/fiches
const creerFiche = async (req, res) => {
  try {
    const { titre, matiere, resume, conceptsCles, explications, pointsImportants, flashcards, coursId, couleur } = req.body;

    const fiche = await Fiche.create({
      titre,
      matiere,
      resume: resume || "",
      conceptsCles: conceptsCles || [],
      explications: explications || {},
      pointsImportants: pointsImportants || [],
      flashcards: flashcards || [],
      coursId: coursId || null,
      couleur: couleur || "#6366f1",
      utilisateurId: req.utilisateur.id,
      genereeParIA: false,
    });

    const progression = await Progression.findOne({ where: { utilisateurId: req.utilisateur.id } });
    if (progression) {
      const stats = progression.stats || {};
      stats.fichesTotal = (stats.fichesTotal || 0) + 1;
      await progression.update({ stats });
    }

    res.status(201).json({ success: true, fiche: formaterFiche(fiche) });
  } catch (error) {
    console.error("Erreur creerFiche:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la création de la fiche." });
  }
};

// PUT /api/fiches/:id
const modifierFiche = async (req, res) => {
  try {
    const { titre, matiere, resume, conceptsCles, explications, pointsImportants, flashcards, couleur, estPublique } = req.body;

    const fiche = await Fiche.findOne({
      where: {
        id: req.params.id,
        utilisateurId: req.utilisateur.id,
      },
    });

    if (!fiche) {
      return res.status(404).json({ success: false, message: "Fiche introuvable." });
    }

    if (titre !== undefined) fiche.titre = titre;
    if (matiere !== undefined) fiche.matiere = matiere;
    if (resume !== undefined) fiche.resume = resume;
    if (conceptsCles !== undefined) fiche.conceptsCles = conceptsCles;
    if (explications !== undefined) fiche.explications = explications;
    if (pointsImportants !== undefined) fiche.pointsImportants = pointsImportants;
    if (flashcards !== undefined) fiche.flashcards = flashcards;
    if (couleur !== undefined) fiche.couleur = couleur;
    if (estPublique !== undefined) fiche.estPublique = estPublique;

    await fiche.save();
    res.json({ success: true, fiche });
  } catch (error) {
    console.error("Erreur modifierFiche:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la modification de la fiche." });
  }
};

// DELETE /api/fiches/:id
const supprimerFiche = async (req, res) => {
  try {
    const fiche = await Fiche.destroy({
      where: {
        id: req.params.id,
        utilisateurId: req.utilisateur.id,
      },
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
      where: {
        id: req.params.id,
        utilisateurId: req.utilisateur.id,
      },
    });

    if (!fiche) {
      return res.status(404).json({ success: false, message: "Fiche introuvable." });
    }

    const flashcards = fiche.flashcards || [];
    const flashcardIndex = flashcards.findIndex((f, i) => i === parseInt(req.params.flashcardId));
    if (flashcardIndex === -1) {
      return res.status(404).json({ success: false, message: "Flashcard introuvable." });
    }

    flashcards[flashcardIndex].niveauMaitrise = niveauMaitrise;
    const joursAvant = Math.pow(2, niveauMaitrise);
    flashcards[flashcardIndex].prochaineRevision = new Date(Date.now() + joursAvant * 86400000);

    await fiche.update({ flashcards });
    res.json({ success: true, flashcard: flashcards[flashcardIndex] });
  } catch (error) {
    console.error("Erreur mettreAJourFlashcard:", error);
    res.status(500).json({ success: false, message: "Impossible de mettre à jour la flashcard." });
  }
};

// GET /api/fiches/publique — Liste toutes les fiches publiques (Communauté)
const getFichesPubliques = async (req, res) => {
  try {
    const { matiere, search } = req.query;
    const where = { estPublique: true };

    if (matiere) where.matiere = matiere;
    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { resume: { [Op.like]: `%${search}%` } },
      ];
    }

    const fiches = await Fiche.findAll({
      where,
      include: [inclureCours],
      order: [["createdAt", "DESC"]],
      limit: 50, // Limite pour la bibliothèque publique
    });

    res.json({ success: true, count: fiches.length, fiches: fiches.map(formaterFiche) });
  } catch (error) {
    console.error("Erreur getFichesPubliques:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération de la bibliothèque." });
  }
};

module.exports = {
  getFiches,
  getFicheParId,
  creerFiche,
  modifierFiche,
  supprimerFiche,
  mettreAJourFlashcard,
  getFichesPubliques,
};