/**
 * Modèle Mongoose pour les Cours
 */

const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: [true, "Le titre est requis"],
      trim: true,
    },
    matiere: {
      type: String,
      required: [true, "La matière est requise"],
      trim: true,
    },
    contenu: {
      type: String,
      required: [true, "Le contenu est requis"],
    },
    // Résumé généré par l'IA
    resumeIA: {
      type: String,
      default: null,
    },
    // Concepts clés extraits par l'IA
    conceptsCles: [String],
    // Niveau de difficulté
    niveau: {
      type: String,
      enum: ["débutant", "intermédiaire", "avancé"],
      default: "intermédiaire",
    },
    tags: [String],
    // Fichier PDF uploadé (chemin)
    fichierPDF: {
      type: String,
      default: null,
    },
    // Utilisateur propriétaire
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Durée estimée de révision (en minutes)
    dureeEstimee: {
      type: Number,
      default: 30,
    },
  },
  {
    timestamps: true,
  }
);

// Index de recherche textuelle
courseSchema.index({ titre: "text", contenu: "text", matiere: "text" });

module.exports = mongoose.model("Course", courseSchema);
