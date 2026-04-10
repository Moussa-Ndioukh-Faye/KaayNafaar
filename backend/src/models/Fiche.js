/**
 * Modèle Mongoose pour les Fiches de révision
 */

const mongoose = require("mongoose");

const ficheSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    // Cours source
    cours: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Contenu structuré de la fiche (généré par IA ou manuel)
    contenu: {
      resume: { type: String, default: "" },
      conceptsCles: [String],
      explications: { type: Map, of: String },
      pointsImportants: [String],
    },
    // Flashcards associées
    flashcards: [
      {
        question: { type: String, required: true },
        reponse: { type: String, required: true },
        niveauMaitrise: {
          type: Number,
          min: 0,
          max: 5,
          default: 0,
        },
        prochaineRevision: { type: Date, default: Date.now },
      },
    ],
    matiere: { type: String, default: "" },
    couleur: {
      type: String,
      default: "#6366f1", // indigo par défaut
    },
    // Générée par IA ou créée manuellement
    genereeParIA: { type: Boolean, default: false },
    estPublique: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Fiche", ficheSchema);
