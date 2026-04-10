/**
 * Contrôleur des Quiz
 */

const Quiz = require("../models/Quiz");
const Progression = require("../models/Progression");

// GET /api/quiz
const getQuiz = async (req, res) => {
  try {
    const { matiere, difficulte } = req.query;
    const filtre = { utilisateur: req.utilisateur._id };
    if (matiere) filtre.matiere = matiere;
    if (difficulte) filtre.difficulte = difficulte;

    const quizList = await Quiz.find(filtre)
      .populate("cours", "titre")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: quizList.length, quizList });
  } catch (error) {
    console.error("Erreur getQuiz:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer les quiz." });
  }
};

// GET /api/quiz/:id
const getQuizParId = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    }).populate("cours", "titre matiere");

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz introuvable." });
    }

    res.json({ success: true, quiz });
  } catch (error) {
    console.error("Erreur getQuizParId:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer ce quiz." });
  }
};

// POST /api/quiz
const creerQuiz = async (req, res) => {
  try {
    const { titre, matiere, questions, difficulte, dureeMinutes, coursId } = req.body;

    const quiz = await Quiz.create({
      titre,
      matiere,
      questions,
      difficulte: difficulte || "moyen",
      dureeMinutes: dureeMinutes || 10,
      cours: coursId || null,
      utilisateur: req.utilisateur._id,
    });

    await Progression.findOneAndUpdate(
      { utilisateur: req.utilisateur._id },
      { $inc: { "stats.quizTotal": 1 } }
    );

    res.status(201).json({ success: true, quiz });
  } catch (error) {
    console.error("Erreur creerQuiz:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la création du quiz." });
  }
};

// POST /api/quiz/:id/session — Soumettre les résultats d'une session
const soumettreSession = async (req, res) => {
  try {
    const { reponses, tempsPasse } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz introuvable." });
    }

    // Valider que le tableau de réponses correspond au nombre de questions
    if (!Array.isArray(reponses) || reponses.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        message: `Le nombre de réponses (${reponses?.length ?? 0}) ne correspond pas au nombre de questions (${quiz.questions.length}).`,
      });
    }

    // Calculer le score
    let score = 0;
    const reponsesAnnotees = reponses.map((rep, index) => {
      const question = quiz.questions[index];
      const estCorrecte =
        rep.reponseUtilisateur?.toLowerCase().trim() ===
        question.reponseCorrecte?.toLowerCase().trim();
      if (estCorrecte) score++;
      return { questionIndex: index, reponseUtilisateur: rep.reponseUtilisateur, estCorrecte };
    });

    // Enregistrer la session
    quiz.sessions.push({
      score,
      total: quiz.questions.length,
      tempsPasse,
      reponses: reponsesAnnotees,
    });

    await quiz.save();

    // Mettre à jour le score moyen dans la progression
    const toutesLesSessions = quiz.sessions;
    const scoreMoyen =
      toutesLesSessions.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) /
      toutesLesSessions.length;

    await Progression.findOneAndUpdate(
      { utilisateur: req.utilisateur._id },
      { "stats.scoreMoyenQuiz": Math.round(scoreMoyen) }
    );

    res.json({
      success: true,
      resultat: {
        score,
        total: quiz.questions.length,
        pourcentage: Math.round((score / quiz.questions.length) * 100),
        reponses: reponsesAnnotees,
      },
    });
  } catch (error) {
    console.error("Erreur soumettreSession:", error);
    res.status(500).json({ success: false, message: "Erreur lors de l'enregistrement des résultats." });
  }
};

// DELETE /api/quiz/:id
const supprimerQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({
      _id: req.params.id,
      utilisateur: req.utilisateur._id,
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz introuvable." });
    }

    res.json({ success: true, message: "Quiz supprimé." });
  } catch (error) {
    console.error("Erreur supprimerQuiz:", error);
    res.status(500).json({ success: false, message: "Impossible de supprimer ce quiz." });
  }
};

module.exports = { getQuiz, getQuizParId, creerQuiz, soumettreSession, supprimerQuiz };
