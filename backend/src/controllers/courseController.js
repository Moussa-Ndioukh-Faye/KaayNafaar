/**
 * Contrôleur des Cours
 * CRUD + upload PDF
 */

const Course = require("../models/Course");
const Progression = require("../models/Progression");

// GET /api/courses — Lister les cours de l'utilisateur
const getCours = async (req, res) => {
  try {
    const { matiere, niveau, search } = req.query;
    const filtre = { utilisateur: req.utilisateur._id };

    if (matiere) filtre.matiere = matiere;
    if (niveau) filtre.niveau = niveau;
    if (search) filtre.$text = { $search: search };

    const cours = await Course.find(filtre).sort({ createdAt: -1 });
    res.json({ success: true, count: cours.length, cours });
  } catch (error) {
    console.error("Erreur getCours:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer les cours." });
  }
};

// GET /api/courses/:id — Détail d'un cours
const getCoursParId = async (req, res) => {
  try {
    const cours = await Course.findOne({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    });

    if (!cours) {
      return res
        .status(404)
        .json({ success: false, message: "Cours introuvable." });
    }

    res.json({ success: true, cours });
  } catch (error) {
    console.error("Erreur getCoursParId:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer ce cours." });
  }
};

// POST /api/courses — Créer un cours
const creerCours = async (req, res) => {
  try {
    const { titre, matiere, contenu, niveau, tags, dureeEstimee } = req.body;

    const cours = await Course.create({
      titre,
      matiere,
      contenu,
      niveau: niveau || "intermédiaire",
      tags: tags || [],
      dureeEstimee: dureeEstimee || 30,
      utilisateur: req.utilisateur._id,
      // Si un fichier PDF a été uploadé
      fichierPDF: req.file ? req.file.path : null,
    });

    // Mettre à jour le compteur de cours dans la progression
    await Progression.findOneAndUpdate(
      { utilisateur: req.utilisateur._id },
      { $inc: { "stats.coursTotal": 1 } }
    );

    res.status(201).json({ success: true, cours });
  } catch (error) {
    console.error("Erreur creerCours:", error);
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors)[0]?.message || "Données invalides.";
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: "Erreur lors de la création du cours." });
  }
};

// PUT /api/courses/:id — Modifier un cours
const modifierCours = async (req, res) => {
  try {
    // Whitelist des champs modifiables — évite l'injection de champs sensibles
    const { titre, matiere, contenu, niveau, tags, dureeEstimee } = req.body;
    const miseAJour = {};
    if (titre !== undefined) miseAJour.titre = titre;
    if (matiere !== undefined) miseAJour.matiere = matiere;
    if (contenu !== undefined) miseAJour.contenu = contenu;
    if (niveau !== undefined) miseAJour.niveau = niveau;
    if (tags !== undefined) miseAJour.tags = tags;
    if (dureeEstimee !== undefined) miseAJour.dureeEstimee = dureeEstimee;

    const cours = await Course.findOneAndUpdate(
      { _id: req.params.id, utilisateur: req.utilisateur._id },
      miseAJour,
      { new: true, runValidators: true }
    );

    if (!cours) {
      return res
        .status(404)
        .json({ success: false, message: "Cours introuvable." });
    }

    res.json({ success: true, cours });
  } catch (error) {
    console.error("Erreur modifierCours:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la modification du cours." });
  }
};

// DELETE /api/courses/:id — Supprimer un cours
const supprimerCours = async (req, res) => {
  try {
    const cours = await Course.findOneAndDelete({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    });

    if (!cours) {
      return res
        .status(404)
        .json({ success: false, message: "Cours introuvable." });
    }

    res.json({ success: true, message: "Cours supprimé avec succès." });
  } catch (error) {
    console.error("Erreur supprimerCours:", error);
    res.status(500).json({ success: false, message: "Impossible de supprimer ce cours." });
  }
};

module.exports = {
  getCours,
  getCoursParId,
  creerCours,
  modifierCours,
  supprimerCours,
};
