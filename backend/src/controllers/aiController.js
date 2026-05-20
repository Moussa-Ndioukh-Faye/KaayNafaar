const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const FeedbackIA = require("../models/FeedbackIA");
const { AIProviderManager } = require("../utils/aiProviderManager");
const { rechercherContexte, mettreAJourProfilApprenant } = require("../utils/aiPro");
const { orchestrerRecherche } = require("../utils/searchOrchestrator");

const aiManager = new AIProviderManager();

// Priorité Gemini Pro pour le chat, Flash pour le reste
const ORDRE_FICHE_QUIZ = ["gemini", "groq"];
const ORDRE_CHAT = ["gemini", "groq"];

const SYSTEM_PROMPT = `Tu es un professeur expert et assistant d'étude. 
RÈGLES :
1. Réponds UNIQUEMENT en JSON valide.
2. Pas de texte avant ou après le JSON.
3. Ne répète pas le contenu du cours inutilement.
4. Sois concis et précis.`;

const FICHE_SCHEMA = `
Structure attendue pour la fiche :
{
  "title": "Titre du cours",
  "summary": "Résumé global",
  "concepts": [
    {"term": "Concept 1", "definition": "Explication"},
    {"term": "Concept 2", "definition": "Explication"}
  ],
  "flashcards": [
    {"question": "Question ?", "answer": "Réponse"}
  ]
}`;

const QUIZ_SCHEMA = `
Structure attendue pour le quiz :
{
  "title": "Titre du quiz",
  "description": "Brève description",
  "questions": [
    {
      "question": "Énoncé de la question ?",
      "answers": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0 (index de la bonne réponse)
    }
  ]
}`;

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
  let propre = texte.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  
  // Tentative de réparation de JSON tronqué
  try {
    JSON.parse(propre);
    return propre;
  } catch (e) {
    // Si c'est tronqué, on essaie de fermer les crochets et accolades
    let ouvertures = [];
    for (let char of propre) {
      if (char === "{" || char === "[") ouvertures.push(char);
      else if (char === "}" || char === "]") {
        const last = ouvertures[ouvertures.length - 1];
        if ((char === "}" && last === "{") || (char === "]" && last === "[")) {
          ouvertures.pop();
        }
      }
    }
    while (ouvertures.length > 0) {
      const last = ouvertures.pop();
      propre += (last === "{" ? "}" : "]");
    }
    return propre;
  }
};

const envoyerErreur = (res, message, status = 500) => {
  if (!res.headersSent) {
    res.status(status).json({ success: false, message });
  } else {
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
};

// POST /api/ai/generer-fiche
const genererFiche = async (req, res) => {
  if (!aiManager.estDisponible()) return envoyerErreur(res, "Service IA indisponible.", 503);
  try {
    const { contenuCours, titreCours, coursId } = req.body || {};
    if (!contenuCours || detecterInjectionPrompt(contenuCours)) return envoyerErreur(res, "Contenu invalide.", 400);

    const ragResult = await rechercherContexte(contenuCours.substring(0, 2000), req.utilisateur.id);
    const contextePertinent = ragResult.context || contenuCours.substring(0, 8000);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let streamAborted = false;
    req.on("close", () => { streamAborted = true; });

    await aiManager.streamComplete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Génère une fiche de révision pour le cours "${titreCours}" basée sur ce contenu : ${contextePertinent}\n\n${FICHE_SCHEMA}`,
        },
      ],
      onDelta: (delta) => { if (!streamAborted) res.write(`data: ${JSON.stringify({ delta })}\n\n`); },
      onDone: async (texteComplet) => {
        if (streamAborted) return;
        try {
          const ficheData = JSON.parse(nettoyerJSON(texteComplet));
          const fiche = await Fiche.create({ ...ficheData, coursId, utilisateurId: req.utilisateur.id });
          res.write(`data: ${JSON.stringify({ done: true, ficheId: fiche.id, fiche: ficheData })}\n\n`);
        } catch (parseError) {
          console.error("❌ Erreur parsing fiche:", parseError, texteComplet);
          res.write(`data: ${JSON.stringify({ error: "Erreur de format IA (JSON invalide)" })}\n\n`);
        }
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
    const { contenuCours, titreCours, nombreQuestions, difficulte, coursId } = req.body || {};
    if (!contenuCours) return envoyerErreur(res, "Contenu requis.", 400);
    const ragResult = await rechercherContexte(contenuCours.substring(0, 2000), req.utilisateur.id);
    const contextePertinent = ragResult.context || contenuCours.substring(0, 8000);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let streamAborted = false;
    req.on("close", () => { streamAborted = true; });

    await aiManager.streamComplete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Génère un quiz de ${nombreQuestions} questions pour "${titreCours}" (Difficulté: ${difficulte}) basé sur ce contenu : ${contextePertinent}\n\n${QUIZ_SCHEMA}`,
        },
      ],
      onDelta: (delta) => { if (!streamAborted) res.write(`data: ${JSON.stringify({ delta })}\n\n`); },
      onDone: async (texteComplet) => {
        if (streamAborted) return;
        try {
          const quizData = JSON.parse(nettoyerJSON(texteComplet));
          const quiz = await Quiz.create({ ...quizData, difficulte, coursId, utilisateurId: req.utilisateur.id });
          res.write(`data: ${JSON.stringify({ done: true, quizId: quiz.id, quiz: quizData })}\n\n`);
        } catch (parseError) {
          console.error("❌ Erreur parsing quiz:", parseError, texteComplet);
          res.write(`data: ${JSON.stringify({ error: "Erreur de format IA (JSON invalide)" })}\n\n`);
        }
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
    const { concept, contexte } = req.body || {};
    if (!concept) return envoyerErreur(res, "Concept requis.", 400);
    res.setHeader("Content-Type", "text/event-stream");

    let streamAborted = false;
    req.on("close", () => { streamAborted = true; });

    await aiManager.streamComplete({
      messages: [
        { role: "system", content: "Tu es un professeur bienveillant qui explique simplement." },
        { role: "user", content: `Explique le concept : ${concept}\nContexte: ${contexte || ""}` },
      ],
      onDelta: (delta) => { if (!streamAborted) res.write(`data: ${JSON.stringify({ delta })}\n\n`); },
      onDone: () => { if (!streamAborted) res.end(); },
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
    const { cours, dateDebut, dateFin, disponibilite } = req.body || {};
    if (!cours || !dateDebut || !dateFin) return res.status(400).json({ success: false, message: "Champs requis manquants." });
    const texte = await aiManager.complete({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Génère un planning JSON pour réviser ces cours: ${JSON.stringify(cours)} du ${dateDebut} au ${dateFin} avec ${disponibilite || 2}h/jour.` },
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
    const { messages, contexte } = req.body || {};
    if (!messages || !messages.length) return envoyerErreur(res, "Messages requis.", 400);

    let sources = [];
    let contexteFinal = contexte;
    const derniereQuestionRaw = messages[messages.length - 1]?.content || "";

    if (!contexteFinal && derniereQuestionRaw) {
      const searchResult = await orchestrerRecherche(derniereQuestionRaw, req.utilisateur.id);
      contexteFinal = searchResult.context;
      sources = searchResult.sources;
    }

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
${contexteFinal || "Aucune information trouvée."}

MA QUESTION : ${derniereQuestionRaw}`,
    };

    const history = messages.slice(0, -1).slice(-5);
    const finalMessages = [systemMessage, ...history, messageInjecte];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let streamAborted = false;
    req.on("close", () => { streamAborted = true; });

    await aiManager.streamComplete({
      messages: finalMessages,
      onDelta: (delta) => { if (!streamAborted) res.write(`data: ${JSON.stringify({ delta })}\n\n`); },
      onDone: async (texteComplet) => {
        if (streamAborted) return;
        if (derniereQuestionRaw) {
          mettreAJourProfilApprenant(req.utilisateur.id, derniereQuestionRaw, texteComplet).catch(() => {});
        }
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
