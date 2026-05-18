/**
 * Contrôleur des Quiz
 */

const Quiz = require("../models/Quiz");
const Progression = require("../models/Progression");

// GET /api/quiz
const getQuiz = async (req, res) => {
  try {
    const { matiere, difficulte } = req.query;
    const where = { utilisateurId: req.utilisateur.id };
    if (matiere) where.matiere = matiere;
    if (difficulte) where.difficulte = difficulte;

    const quizList = await Quiz.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, count: quizList.length, quizList });
  } catch (error) {
    console.error("Erreur getQuiz:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer les quiz." });
  }
};

const { Op } = require("sequelize");

// ...

// GET /api/quiz/:id
const getQuizParId = async (req, res) => {
  try {
    const userId = req.utilisateur?.id;
    const where = { id: req.params.id };
    
    if (!userId) {
      where.estPublique = true;
    } else {
      where[Op.or] = [
        { utilisateurId: userId },
        { estPublique: true }
      ];
    }

    const quiz = await Quiz.findOne({ where });

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz introuvable ou privé." });
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
      questions: questions || [],
      difficulte: difficulte || "moyen",
      dureeMinutes: dureeMinutes || 10,
      coursId: coursId || null,
      utilisateurId: req.utilisateur.id,
    });

    const progression = await Progression.findOne({ where: { utilisateurId: req.utilisateur.id } });
    if (progression) {
      const stats = progression.stats || {};
      stats.quizTotal = (stats.quizTotal || 0) + 1;
      await progression.update({ stats });
    }

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
    const userId = req.utilisateur?.id;

    const where = { id: req.params.id };
    if (!userId) {
      where.estPublique = true;
    } else {
      where[Op.or] = [{ utilisateurId: userId }, { estPublique: true }];
    }

    const quiz = await Quiz.findOne({ where });

    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz introuvable." });
    }

    if (!Array.isArray(reponses) || reponses.length !== quiz.questions.length) {
      return res.status(400).json({
        success: false,
        message: `Nombre de réponses invalide.`,
      });
    }

    let score = 0;
    const reponsesAnnotees = reponses.map((rep, index) => {
      const question = quiz.questions[index];
      const estCorrecte =
        rep.reponseUtilisateur?.toLowerCase().trim() ===
        question.reponseCorrecte?.toLowerCase().trim();
      if (estCorrecte) score++;
      return { questionIndex: index, reponseUtilisateur: rep.reponseUtilisateur, estCorrecte };
    });

    // Sauvegarder uniquement si l'utilisateur est authentifié et propriétaire du quiz
    if (userId && quiz.utilisateurId === userId) {
      const sessions = quiz.sessions || [];
      sessions.push({
        date: new Date(),
        score,
        total: quiz.questions.length,
        tempsPasse,
        reponses: reponsesAnnotees,
      });

      await quiz.update({ sessions });

      const scoreMoyen = sessions.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / sessions.length;

      const progression = await Progression.findOne({ where: { utilisateurId: userId } });
      if (progression) {
        const stats = progression.stats || {};
        stats.scoreMoyenQuiz = Math.round(scoreMoyen);
        await progression.update({ stats });
      }
    }

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
    res.status(500).json({ success: false, message: "Erreur lors du calcul des résultats." });
  }
};

// DELETE /api/quiz/:id
const supprimerQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.destroy({
      where: {
        id: req.params.id,
        utilisateurId: req.utilisateur.id,
      },
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