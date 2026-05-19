const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const Progression = require("../models/Progression");
const User = require("../models/User");
const FeedbackIA = require("../models/FeedbackIA");
const { AIProviderManager } = require("../utils/aiProviderManager");
const { rechercherContexte, mettreAJourProfilApprenant } = require("../utils/aiPro");
const { orchestrerRecherche } = require("../utils/searchOrchestrator");

const aiManager = new AIProviderManager();

// Priorité Gemini Pro pour le chat, Flash pour le reste
const ORDRE_FICHE_QUIZ = ["gemini", "groq"];
const ORDRE_CHAT = ["gemini-pro", "gemini", "groq"];

const SYSTEM_PROMPT = `Tu es un professeur expert et assistant d'étude pour étudiants en génie logiciel et systèmes d'information.
Tu dois répondre UNIQUEMENT en JSON valide, sans texte avant ou après.
Sois précis, pédagogique et adapte ton langage au niveau étudiant.`;

const detecterInjectionPrompt = (contenu) => {
  if (!contenu || typeof contenu !== "string") return false;
  const patternsDanger = [
    /ignore toutes les instructions précédentes/i,
    /ignore all previous instructions/i,
    /tu es maintenant un/i,
    /you are now a/i,
    /système :/i,
    /system :/i,
    /nouveau prompt/i,
    /new prompt/i,
    /répond en tant que/i,
    /act as/i,
  ];
  return patternsDanger.some((pattern) => pattern.test(contenu));
};

const nettoyerJSON = (texte) => {
  return texte.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
};

const envoyerErreur = (res, message, status = 500) => {
  if (!res.headersSent) {
    res.status(status).json({ success: false, message });
  } else {
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
};

const resumerConversation = async (userId, messagesRecents) => {
  try {
    const utilisateur = await User.findByPk(userId);
    if (!utilisateur) return;
    const messagesTexte = messagesRecents
      .map(m => `${m.role === "user" ? "Élève" : "Assistant"} : ${(m.content || "").substring(0, 200)}`)
      .join("\n");
    const resume = await aiManager.complete({
      messages: [
        { role: "system", content: "Résume cette conversation pédagogique en 2-3 phrases." },
        { role: "user", content: messagesTexte },
      ],
      maxTokens: 256,
    });
    const nouveauResume = `[${new Date().toLocaleDateString("fr-FR")}] ${resume}`;
    let memoire = utilisateur.memoireLongTerme || "";
    const lignes = [nouveauResume, ...memoire.split("\n").filter(l => l.trim())].slice(0, 30);
    await utilisateur.update({ memoireLongTerme: lignes.join("\n") });
  } catch (err) {
    console.error("❌ Erreur résumé conversation:", err.message);
  }
};

// POST /api/ai/generer-fiche
const genererFiche = async (req, res) => {
  if (!aiManager.estDisponible()) return envoyerErreur(res, "Service IA indisponible.", 503);
  try {
    const { contenuCours, titreCours, coursId } = req.body;
    if (!contenuCours || detecterInjectionPrompt(contenuCours)) return envoyerErreur(res, "Contenu invalide.", 400);

    const ragResult = await rechercherContexte(contenuCours.substring(0, 2000), req.utilisateur.id);
    const contextePertinent = ragResult.context || contenuCours.substring(0, 8000);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await aiManager.streamComplete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Génère une fiche de révision JSON pour le cours "${titreCours}" basé sur ce contenu : ${contextePertinent}`,
        },
      ],
      onDelta: (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`),
      onDone: async (texteComplet) => {
        const ficheData = JSON.parse(nettoyerJSON(texteComplet));
        const fiche = await Fiche.create({ ...ficheData, coursId, utilisateurId: req.utilisateur.id });
        res.write(`data: ${JSON.stringify({ done: true, ficheId: fiche.id, fiche: ficheData })}\n\n`);
        res.end();
      },
      onError: (message) => envoyerErreur(res, message),
      ordre: ORDRE_FICHE_QUIZ,
    });
  } catch (error) {
    envoyerErreur(res, "Erreur lors de la génération de la fiche.");
  }
};

// POST /api/ai/generer-quiz
const genererQuiz = async (req, res) => {
  if (!aiManager.estDisponible()) return envoyerErreur(res, "Service IA indisponible.", 503);
  try {
    const { contenuCours, titreCours, nombreQuestions, difficulte, coursId } = req.body;
    const ragResult = await rechercherContexte(contenuCours.substring(0, 2000), req.utilisateur.id);
    const contextePertinent = ragResult.context || contenuCours.substring(0, 8000);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await aiManager.streamComplete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Génère un quiz JSON de ${nombreQuestions} questions pour "${titreCours}" (Difficulté: ${difficulte}) basé sur : ${contextePertinent}`,
        },
      ],
      onDelta: (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`),
      onDone: async (texteComplet) => {
        const quizData = JSON.parse(nettoyerJSON(texteComplet));
        const quiz = await Quiz.create({ ...quizData, difficulte, coursId, utilisateurId: req.utilisateur.id });
        res.write(`data: ${JSON.stringify({ done: true, quizId: quiz.id, quiz: quizData })}\n\n`);
        res.end();
      },
      onError: (message) => envoyerErreur(res, message),
      ordre: ORDRE_FICHE_QUIZ,
    });
  } catch (error) {
    envoyerErreur(res, "Erreur lors de la génération du quiz.");
  }
};

// POST /api/ai/expliquer
const expliquerConcept = async (req, res) => {
  if (!aiManager.estDisponible()) return envoyerErreur(res, "Service IA indisponible.", 503);
  try {
    const { concept, contexte } = req.body;
    res.setHeader("Content-Type", "text/event-stream");
    await aiManager.streamComplete({
      messages: [
        { role: "system", content: "Tu es un professeur bienveillant qui explique simplement." },
        { role: "user", content: `Explique le concept : ${concept}\nContexte: ${contexte}` },
      ],
      onDelta: (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`),
      onDone: () => res.end(),
      onError: (message) => envoyerErreur(res, message),
      ordre: ORDRE_CHAT,
    });
  } catch (error) {
    envoyerErreur(res, "Erreur lors de l'explication.");
  }
};

// POST /api/ai/planning
const genererPlanning = async (req, res) => {
  if (!aiManager.estDisponible()) return res.status(503).json({ success: false, message: "Service IA indisponible." });
  try {
    const { cours, dateDebut, dateFin, disponibilite } = req.body;
    const texte = await aiManager.complete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Génère un planning JSON pour réviser ces cours: ${JSON.stringify(cours)} du ${dateDebut} au ${dateFin} avec ${disponibilite}h/jour.` },
      ],
      ordre: ORDRE_FICHE_QUIZ,
    });
    res.json({ success: true, planning: JSON.parse(nettoyerJSON(texte)) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur lors de la génération du planning." });
  }
};

// POST /api/ai/chat
const chat = async (req, res) => {
  if (!aiManager.estDisponible()) return envoyerErreur(res, "Service IA indisponible.", 503);
  try {
    let { messages, contexte } = req.body;
    let sources = [];
    const utilisateur = await User.findByPk(req.utilisateur.id);

    if (!contexte) {
      const derniereQuestion = messages[messages.length - 1].content;
      console.log(`📡 [CHAT] Orchestration pour: ${derniereQuestion}`);
      const searchResult = await orchestrerRecherche(derniereQuestion, req.utilisateur.id);
      contexte = searchResult.context;
      sources = searchResult.sources;
    }

    const derniereQuestionRaw = messages[messages.length - 1].content;
    const systemMessage = {
      role: "system",
      content: `Tu es un assistant pédagogique expert.
RÈGLES D'OR :
- Ton savoir s'arrête en 2023. Les infos fournies ci-dessous sont de 2024-2025.
- Tu DOIS utiliser ces infos même si elles contredisent ta mémoire interne.
- Bassirou Diomaye Faye est le président actuel du Sénégal (depuis avril 2024). Macky Sall n'est plus président.`,
    };

    const messageInjecte = {
      role: "user",
      content: `INFOS RÉCENTES (2024-2025) :
${contexte || "Aucune information trouvée."}

MA QUESTION : ${derniereQuestionRaw}`,
    };

    const history = messages.slice(0, -1).slice(-5);
    const finalMessages = [systemMessage, ...history, messageInjecte];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await aiManager.streamComplete({
      messages: finalMessages,
      onDelta: (delta) => res.write(`data: ${JSON.stringify({ delta })}\n\n`),
      onDone: async (texteComplet) => {
        mettreAJourProfilApprenant(req.utilisateur.id, derniereQuestionRaw, texteComplet).catch(console.error);
        res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
        res.end();
      },
      onError: (message) => envoyerErreur(res, message),
      ordre: ORDRE_CHAT,
    });
  } catch (error) {
    envoyerErreur(res, "Erreur de connexion.");
  }
};

// Feedback
const feedback = async (req, res) => {
  try {
    const fb = await FeedbackIA.create({ ...req.body, utilisateurId: req.utilisateur.id });
    res.json({ success: true, feedback: fb });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur feedback." });
  }
};

const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await FeedbackIA.findAll({ where: { utilisateurId: req.utilisateur.id }, order: [["createdAt", "DESC"]] });
    res.json({ success: true, feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur feedbacks." });
  }
};

module.exports = {
  genererFiche,
  genererQuiz,
  expliquerConcept,
  genererPlanning,
  chat,
  feedback,
  getFeedbacks,
};
