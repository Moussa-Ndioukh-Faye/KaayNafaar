/**
 * Contrôleur des Fiches de révision
 */

const Fiche = require("../models/Fiche");
const Course = require("../models/Course");
const Progression = require("../models/Progression");
const { calculerSM2 } = require("../utils/sm2");
const { Op } = require("sequelize");
const { coursPossede } = require("../utils/coursPossede");

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

/**
 * Version d'une fiche montrée aux autres étudiants (bibliothèque publique) :
 * sans l'identifiant de l'auteur, sans son cours privé, et sans son historique
 * de révision des flashcards (dates, facilité, répétitions).
 */
const formaterFichePublique = (fiche) => {
  const data = formaterFiche(fiche);
  if (!data) return null;
  const reste = { ...data };
  delete reste.utilisateurId;
  delete reste.coursId;
  delete reste.cours;
  return {
    ...reste,
    flashcards: (data.flashcards || []).map(({ question, reponse }) => ({ question, reponse })),
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

    const estAuteur = userId && fiche.utilisateurId === userId;
    res.json({ success: true, fiche: estAuteur ? formaterFiche(fiche) : formaterFichePublique(fiche) });
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
      coursId: await coursPossede(coursId, req.utilisateur.id),
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

// POST /api/fiches/:id/importer — Importer une fiche publique dans son compte
const importerFichePublique = async (req, res) => {
  try {
    const fiche = await Fiche.findOne({
      where: { id: req.params.id, estPublique: true },
    });

    if (!fiche) {
      return res.status(404).json({ success: false, message: "Fiche publique introuvable." });
    }

    const existe = await Fiche.findOne({
      where: { titre: fiche.titre, utilisateurId: req.utilisateur.id },
    });

    if (existe) {
      return res.status(409).json({ success: false, message: "Tu possèdes déjà cette fiche." });
    }

    const copie = await Fiche.create({
      titre: fiche.titre,
      matiere: fiche.matiere,
      resume: fiche.resume,
      conceptsCles: fiche.conceptsCles || [],
      explications: fiche.explications || {},
      pointsImportants: fiche.pointsImportants || [],
      flashcards: fiche.flashcards || [],
      couleur: fiche.couleur || "#6366f1",
      coursId: null,
      utilisateurId: req.utilisateur.id,
      genereeParIA: fiche.genereeParIA || false,
      estPublique: false,
    });

    res.status(201).json({ success: true, fiche: formaterFiche(copie) });
  } catch (error) {
    console.error("Erreur importerFichePublique:", error);
    res.status(500).json({ success: false, message: "Erreur lors de l'import de la fiche." });
  }
};

// PUT /api/fiches/:id/flashcard/:flashcardId — Algorithme SM-2 (Anki)
const mettreAJourFlashcard = async (req, res) => {
  try {
    const { grade } = req.body;
    const q = parseInt(grade);
    if (isNaN(q) || q < 0 || q > 5) {
      return res.status(400).json({ success: false, message: "grade doit être un entier entre 0 et 5." });
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

    const resultat = calculerSM2(q, flashcards[flashcardIndex]);
    Object.assign(flashcards[flashcardIndex], resultat);

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
    const { matiere } = req.query;
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
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

    res.json({ success: true, count: fiches.length, fiches: fiches.map(formaterFichePublique) });
  } catch (error) {
    console.error("Erreur getFichesPubliques:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération de la bibliothèque." });
  }
};

// GET /api/fiches/dues — toutes les flashcards à réviser aujourd'hui
const getFlashcardsDues = async (req, res) => {
  try {
    const fiches = await Fiche.findAll({
      where: { utilisateurId: req.utilisateur.id },
      attributes: ["id", "titre", "flashcards"],
    });

    const maintenant = new Date();
    const dues = [];

    for (const fiche of fiches) {
      const cards = fiche.flashcards || [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (!card.question) continue;
        const nextReview = card.nextReview ? new Date(card.nextReview) : null;
        if (!nextReview || nextReview <= maintenant) {
          dues.push({
            ficheId: fiche.id,
            ficheTitre: fiche.titre,
            index: i,
            question: card.question,
            reponse: card.reponse,
            repetitions: card.repetitions || 0,
            easinessFactor: card.easinessFactor || 2.5,
            nextReview: card.nextReview || null,
          });
        }
      }
    }

    res.json({ success: true, count: dues.length, dues });
  } catch (error) {
    console.error("Erreur getFlashcardsDues:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des flashcards." });
  }
};

module.exports = {
  getFiches,
  getFicheParId,
  creerFiche,
  modifierFiche,
  supprimerFiche,
  importerFichePublique,
  mettreAJourFlashcard,
  getFichesPubliques,
  getFlashcardsDues,
};