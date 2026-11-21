/**
 * Contrôleur des Cours
 * CRUD + upload PDF
 */

const { supprimerFichier } = require("../utils/fichiers");
const Course = require("../models/Course");
const Progression = require("../models/Progression");
const { Op } = require("sequelize");
const { extractionQueue } = require("../utils/worker");

// GET /api/courses — Lister les cours de l'utilisateur
const getCours = async (req, res) => {
  try {
    const { matiere, niveau, search } = req.query;
    const where = { utilisateurId: req.utilisateur.id };

    if (matiere) where.matiere = matiere;
    if (niveau) where.niveau = niveau;
    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      where[Op.or] = [
        { titre: { [Op.like]: `%${escaped}%` } },
        { contenu: { [Op.like]: `%${escaped}%` } },
      ];
    }

    const cours = await Course.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
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
      where: {
        id: req.params.id,
        utilisateurId: req.utilisateur.id,
      },
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
    let { titre, matiere, contenu, niveau, tags, dureeEstimee } = req.body;
    let fichierPath = req.file ? req.file.path : null;

    // Parser tags si c'est une string (upload fichier = FormData)
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    if (!contenu && !fichierPath) {
      return res.status(400).json({ success: false, message: "Contenu ou fichier requis." });
    }

    const cours = await Course.create({
      titre,
      matiere,
      contenu: contenu || "Traitement en cours...", // Texte temporaire si extraction en arrière-plan
      niveau: niveau || "intermédiaire",
      tags: tags || [],
      dureeEstimee: dureeEstimee || 30,
      utilisateurId: req.utilisateur.id,
      fichierPDF: fichierPath,
    });

    // Mettre à jour le compteur de cours dans la progression
    const progression = await Progression.findOne({ where: { utilisateurId: req.utilisateur.id } });
    if (progression) {
      const stats = progression.stats || {};
      stats.coursTotal = (stats.coursTotal || 0) + 1;
      await progression.update({ stats });
    }

    // Si on a un fichier ou si on veut indexer le contenu fourni
    if (fichierPath || contenu) {
      extractionQueue.add("extraire-et-indexer", {
        coursId: cours.id,
        fichierPath,
        originalname: req.file ? req.file.originalname : "manuel.txt",
        utilisateurId: req.utilisateur.id,
        titre: cours.titre,
        contenuDirect: contenu, // Si le texte est déjà là, on l'indexera direct dans le worker
      }).catch(err => console.error("Erreur ajout file d'attente:", err));
    }

    res.status(201).json({ 
      success: true, 
      message: fichierPath ? "Cours créé, extraction en arrière-plan." : "Cours créé.", 
      cours 
    });
  } catch (error) {
    console.error("❌ Erreur creerCours:", error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: "Erreur lors de la création du cours." });
  }
};

// PUT /api/courses/:id — Modifier un cours
const modifierCours = async (req, res) => {
  try {
    const { titre, matiere, contenu, niveau, tags, dureeEstimee } = req.body;

    const cours = await Course.findOne({
      where: {
        id: req.params.id,
        utilisateurId: req.utilisateur.id,
      },
    });

    if (!cours) {
      return res
        .status(404)
        .json({ success: false, message: "Cours introuvable." });
    }

    if (titre !== undefined) cours.titre = titre;
    if (matiere !== undefined) cours.matiere = matiere;
    if (contenu !== undefined) cours.contenu = contenu;
    if (niveau !== undefined) cours.niveau = niveau;
    if (tags !== undefined) cours.tags = tags;
    if (dureeEstimee !== undefined) cours.dureeEstimee = dureeEstimee;

    await cours.save();
    res.json({ success: true, cours });
  } catch (error) {
    console.error("Erreur modifierCours:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la modification du cours." });
  }
};

// DELETE /api/courses/:id — Supprimer un cours
const supprimerCours = async (req, res) => {
  try {
    const cours = await Course.findOne({
      where: {
        id: req.params.id,
        utilisateurId: req.utilisateur.id,
      },
    });

    if (!cours) {
      return res
        .status(404)
        .json({ success: false, message: "Cours introuvable." });
    }

    const fichier = cours.fichierPDF;
    await Course.destroy({ where: { id: cours.id, utilisateurId: req.utilisateur.id } });
    // Minimisation des données : le fichier importé est supprimé avec le cours
    await supprimerFichier(fichier);

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