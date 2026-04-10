/**
 * Modèle Mongoose pour les Quiz
 */

const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: {
    type: String,
    enum: ["qcm", "vrai_faux", "texte_libre"],
    default: "qcm",
  },
  options: [String], // Pour les QCM
  reponseCorrecte: { type: String, required: true },
  explication: { type: String, default: "" },
});

const quizSchema = new mongoose.Schema(
  {
    titre: { type: String, required: true, trim: true },
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
    questions: [questionSchema],
    matiere: { type: String, default: "" },
    difficulte: {
      type: String,
      enum: ["facile", "moyen", "difficile"],
      default: "moyen",
    },
    dureeMinutes: { type: Number, default: 10 },
    // Résultats des sessions de quiz
    sessions: [
      {
        date: { type: Date, default: Date.now },
        score: Number,       // Nombre de bonnes réponses
        total: Number,       // Nombre total de questions
        tempsPasse: Number,  // Secondes
        reponses: [
          {
            questionIndex: Number,
            reponseUtilisateur: String,
            estCorrecte: Boolean,
          },
        ],
      },
    ],
    genereeParIA: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Quiz", quizSchema);
