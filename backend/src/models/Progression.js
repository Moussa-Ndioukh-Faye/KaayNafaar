/**
 * Modèle Mongoose pour le suivi de progression de l'étudiant
 */

const mongoose = require("mongoose");

const progressionSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Statistiques globales
    stats: {
      coursTotal: { type: Number, default: 0 },
      fichesTotal: { type: Number, default: 0 },
      quizTotal: { type: Number, default: 0 },
      scoreMoyenQuiz: { type: Number, default: 0 },
      tempsRevisionTotal: { type: Number, default: 0 }, // minutes
      serie: { type: Number, default: 0 },      // jours consécutifs
      dernierConnexion: { type: Date, default: Date.now },
    },
    // Planning de révision
    planning: [
      {
        date: { type: Date, required: true },
        matiere: { type: String, required: true },
        cours: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          default: null,
        },
        dureeMinutes: { type: Number, default: 30 },
        estComplete: { type: Boolean, default: false },
        notes: { type: String, default: "" },
      },
    ],
    // Progression par matière
    matieres: [
      {
        nom: String,
        niveau: { type: Number, min: 0, max: 100, default: 0 },
        tempsPasse: { type: Number, default: 0 }, // minutes
        quizReussis: { type: Number, default: 0 },
      },
    ],
    // Activité journalière (pour les graphiques)
    activiteJournaliere: [
      {
        date: { type: Date },
        quizFaits: { type: Number, default: 0 },
        fichesCreees: { type: Number, default: 0 },
        tempsRevision: { type: Number, default: 0 }, // minutes
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Progression", progressionSchema);
