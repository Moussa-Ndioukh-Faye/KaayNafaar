const { sequelize } = require("../config/database");
const Progression = require("../models/Progression");
const Fiche = require("../models/Fiche");
const FeedbackIA = require("../models/FeedbackIA");

const getAnalytiques = async (req, res) => {
  try {
    const userId = req.utilisateur.id;

    const [progression, fiches, feedbacks, sm2Stats] = await Promise.all([
      Progression.findOne({ where: { utilisateurId: userId } }),
      Fiche.findAll({ where: { utilisateurId: userId } }),
      FeedbackIA.findAll({ where: { utilisateurId: userId }, order: [["createdAt", "DESC"]] }),
      extraireStatsSM2(userId),
    ]);

    const stats = progression?.stats || {};
    const activite = progression?.activiteJournaliere || [];
    const matieres = progression?.matieres || [];

    const aujourdhui = new Date().toISOString().split("T")[0];
    const activite7Jours = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      const trouve = activite.find(a => a.date === d);
      activite7Jours.push({
        date: d,
        seances: trouve?.seances || 0,
        fiches: trouve?.fiches || 0,
        quiz: trouve?.quiz || 0,
      });
    }

    const totalFlashcards = sm2Stats.total;
    const duesAujourdhui = sm2Stats.dues;
    const retention = sm2Stats.total > 0
      ? Math.round((sm2Stats.maitrise / sm2Stats.total) * 100)
      : 0;
    const efMoyen = sm2Stats.total > 0
      ? Math.round((sm2Stats.sommeEF / sm2Stats.total) * 100) / 100
      : 2.5;

    const totalFeedbacks = feedbacks.length;
    const moyFeedback = totalFeedbacks > 0
      ? Math.round((feedbacks.reduce((s, f) => s + f.note, 0) / totalFeedbacks) * 10) / 10
      : 0;
    const repartitionCategorie = {};
    for (const fb of feedbacks) {
      if (fb.categorie) {
        repartitionCategorie[fb.categorie] = (repartitionCategorie[fb.categorie] || 0) + 1;
      }
    }

    const pointsFaibles = await detecterPointsFaibles(userId, feedbacks, fiches);

    res.json({
      success: true,
      analytics: {
        progression: {
          coursTotal: stats.coursTotal || 0,
          fichesTotal: stats.fichesTotal || 0,
          quizTotal: stats.quizTotal || 0,
          scoreMoyenQuiz: stats.scoreMoyenQuiz || 0,
          serie: stats.serie || 0,
          tempsRevisionTotal: stats.tempsRevisionTotal || 0,
          dernierConnexion: stats.dernierConnexion,
        },
        sm2: {
          totalFlashcards,
          duesAujourdhui,
          retention,
          efMoyen,
          maitrise: sm2Stats.maitrise,
          enApprentissage: sm2Stats.enApprentissage,
        },
        feedback: {
          total: totalFeedbacks,
          moyenne: moyFeedback,
          repartition: repartitionCategorie,
          recents: feedbacks.slice(0, 5),
        },
        activite7Jours,
        matieres: matieres.slice(0, 10),
        pointsFaibles: pointsFaibles.slice(0, 10),
        totalFiches: fiches.length,
      },
    });
  } catch (error) {
    console.error("Erreur analytiques:", error);
    res.status(500).json({ success: false, message: "Erreur lors du chargement des analytiques." });
  }
};

const extraireStatsSM2 = async (userId) => {
  try {
    const fiches = await Fiche.findAll({
      where: { utilisateurId: userId },
      attributes: ["flashcards"],
    });

    let total = 0, dues = 0, maitrise = 0, enApprentissage = 0, sommeEF = 0;
    const maintenant = new Date();

    for (const fiche of fiches) {
      const cards = fiche.flashcards || [];
      for (const card of cards) {
        if (!card.question) continue;
        total++;
        sommeEF += card.easinessFactor || 2.5;

        const nextReview = card.nextReview ? new Date(card.nextReview) : null;
        if (!nextReview || nextReview <= maintenant) {
          dues++;
        }
        if ((card.repetitions || 0) >= 3 && (card.easinessFactor || 2.5) >= 2.0) {
          maitrise++;
        } else if ((card.repetitions || 0) > 0) {
          enApprentissage++;
        }
      }
    }

    return { total, dues, maitrise, enApprentissage, sommeEF };
  } catch (_) {
    return { total: 0, dues: 0, maitrise: 0, enApprentissage: 0, sommeEF: 0 };
  }
};

const detecterPointsFaibles = async (userId, feedbacks, fiches) => {
  const points = [];

  const sujetsFaibles = {};
  for (const fb of feedbacks) {
    if (fb.note <= 2 && fb.contenuAssistant) {
      const sujet = fb.contenuAssistant.substring(0, 60);
      sujetsFaibles[sujet] = (sujetsFaibles[sujet] || 0) + 1;
    }
  }

  for (const [sujet, count] of Object.entries(sujetsFaibles)) {
    if (count >= 2) {
      points.push({ sujet, signalements: count, type: "feedback" });
    }
  }

  for (const fiche of fiches) {
    const cards = fiche.flashcards || [];
    const tauxEchec = cards.filter(c => {
      const r = c.repetitions || 0;
      const ef = c.easinessFactor || 2.5;
      return r === 0 && ef < 2.0;
    }).length;
    if (cards.length > 0 && tauxEchec / cards.length > 0.3) {
      points.push({
        sujet: fiche.titre,
        signalements: tauxEchec,
        total: cards.length,
        type: "sm2",
      });
    }
  }

  return points.sort((a, b) => b.signalements - a.signalements);
};

module.exports = { getAnalytiques };
