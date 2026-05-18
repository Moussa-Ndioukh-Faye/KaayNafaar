const OpenAI = require("openai");
const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const Progression = require("../models/Progression");

const openai = process.env.GEMINI_API_KEY ? new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  maxRetries: 3,
  timeout: 60000,
}) : null;

const groq = process.env.GROQ_API_KEY ? new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  maxRetries: 2,
}) : null;

const MODEL_COMPLEX = "gemini-2.0-flash";
const MODEL_RAPIDE = "llama-3.3-70b-versatile";

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

const { rechercherContexte } = require("../utils/aiPro");

const tenterStream = async (res, messages, onComplet, extraData = {}) => {
  const essais = [
    { client: openai, model: MODEL_COMPLEX },
    { client: groq, model: MODEL_RAPIDE },
  ].filter(e => e.client);

  for (const essai of essais) {
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await essai.client.chat.completions.create({
        model: essai.model,
        messages,
        stream: true,
        max_tokens: 4096,
      });

      let texteAccumule = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          texteAccumule += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

      if (onComplet) {
        await onComplet(texteAccumule, res);
      } else {
        res.write(`data: ${JSON.stringify({ done: true, ...extraData })}\n\n`);
        res.end();
      }
      return;
    } catch (err) {
      console.error(`Erreur stream IA (${essai.model}):`, err.message);
      if (err.status === 429 && essai !== essais[essais.length - 1]) {
        continue;
      }
      const message = err.status === 429
        ? "Limite de requêtes IA atteinte. Attends quelques instants puis réessaie."
        : "Erreur de connexion au service IA. Réessaie.";
      if (!res.headersSent) {
        res.status(err.status || 500).json({ success: false, message });
      } else {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      }
      return;
    }
  }
};

const gererStream = async (res, client, model, messages, onComplet, extraData = {}) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await client.chat.completions.create({
      model: model,
      messages,
      stream: true,
      max_tokens: 4096,
    });

    let texteAccumule = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        texteAccumule += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    if (onComplet) {
      await onComplet(texteAccumule, res);
    } else {
      res.write(`data: ${JSON.stringify({ done: true, ...extraData })}\n\n`);
      res.end();
    }
  } catch (err) {
    console.error(`Erreur stream IA (${model}):`, err);
    const message = err.status === 429
      ? "Limite de requêtes IA atteinte. Attends quelques instants puis réessaie."
      : "Erreur de connexion au service IA. Réessaie.";
    if (!res.headersSent) {
      res.status(err.status || 500).json({ success: false, message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
};

// POST /api/ai/generer-fiche
const genererFiche = async (req, res) => {
  if (!openai && !groq) {
    return res.status(503).json({ success: false, message: "Service IA temporairement indisponible." });
  }
  try {
    const { contenuCours, titreCours, coursId } = req.body;

    if (!contenuCours || detecterInjectionPrompt(contenuCours)) {
      return res.status(400).json({ success: false, message: "Contenu invalide ou potentiellement malveillant détecté." });
    }
    if (contenuCours.length > 50000) {
      return res.status(400).json({ success: false, message: "Contenu trop long (max 50 000 caractères)." });
    }

    await tenterStream(
      res,
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyse ce cours et génère une fiche de révision complète au format JSON strict :

COURS : "${titreCours || "Cours"}"

CONTENU :
${contenuCours}

Réponds UNIQUEMENT avec ce JSON (sans markdown) :
{
  "titre": "Titre de la fiche",
  "resume": "Résumé clair en 5-7 lignes",
  "conceptsCles": ["concept1", "concept2", "..."],
  "explications": {
    "NomConcept1": "Explication détaillée...",
    "NomConcept2": "Explication détaillée..."
  },
  "pointsImportants": ["Point 1", "Point 2", "..."],
  "flashcards": [
    {"question": "...", "reponse": "..."},
    {"question": "...", "reponse": "..."}
  ],
  "diagrammes": ["Suggestion de schéma 1"],
  "conseilsRevision": ["Conseil 1", "Conseil 2"]
}`,
        },
      ],
      async (texteComplet, res) => {
        let ficheData;
        try {
          ficheData = JSON.parse(nettoyerJSON(texteComplet));
        } catch (_) {
          res.write(`data: ${JSON.stringify({ error: "Erreur de parsing JSON" })}\n\n`);
          res.end();
          return;
        }

        const fiche = await Fiche.create({
          titre: ficheData.titre || titreCours || "Fiche générée",
          coursId: coursId || null,
          utilisateurId: req.utilisateur.id,
          resume: ficheData.resume,
          matiere: req.body.matiere || "",
          conceptsCles: ficheData.conceptsCles || [],
          explications: ficheData.explications || {},
          pointsImportants: ficheData.pointsImportants || [],
          flashcards: ficheData.flashcards || [],
          genereeParIA: true,
        });

        const progression = await Progression.findOne({ where: { utilisateurId: req.utilisateur.id } });
        if (progression) {
          const stats = progression.stats || {};
          stats.fichesTotal = (stats.fichesTotal || 0) + 1;
          await progression.update({ stats });
        }

        res.write(`data: ${JSON.stringify({ done: true, ficheId: fiche.id, fiche: ficheData })}\n\n`);
        res.end();
      }
    );
  } catch (error) {
    console.error("Erreur génération fiche IA:", error);
    const msg = "Erreur lors de la génération de la fiche. Réessaie.";
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: msg });
    } else {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
  }
};

// POST /api/ai/generer-quiz
const genererQuiz = async (req, res) => {
  if (!openai && !groq) {
    return res.status(503).json({ success: false, message: "Service IA temporairement indisponible." });
  }
  try {
    const { contenuCours, titreCours, nombreQuestions, difficulte, coursId } = req.body;

    if (!contenuCours || detecterInjectionPrompt(contenuCours)) {
      return res.status(400).json({ success: false, message: "Contenu invalide ou potentiellement malveillant détecté." });
    }
    if (contenuCours.length > 50000) {
      return res.status(400).json({ success: false, message: "Contenu trop long (max 50 000 caractères)." });
    }

    const n = Math.min(Math.max(parseInt(nombreQuestions) || 5, 1), 20);

    await tenterStream(
      res,
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Génère ${n} questions de quiz sur ce cours. Réponds UNIQUEMENT en JSON :

COURS : "${titreCours || "Cours"}"
DIFFICULTÉ : ${difficulte || "moyen"}

CONTENU :
${contenuCours}

Format JSON strict :
{
  "titre": "Quiz : ${titreCours || "Cours"}",
  "questions": [
    {
      "question": "Question ici ?",
      "type": "qcm",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "reponseCorrecte": "Option A",
      "explication": "Explication de la bonne réponse"
    }
  ]
}`,
        },
      ],
      async (texteComplet, res) => {
        let quizData;
        try {
          quizData = JSON.parse(nettoyerJSON(texteComplet));
        } catch (_) {
          res.write(`data: ${JSON.stringify({ error: "Réponse IA invalide. Réessaie." })}\n\n`);
          res.end();
          return;
        }

        const quiz = await Quiz.create({
          titre: quizData.titre,
          matiere: req.body.matiere || titreCours || "",
          questions: quizData.questions,
          difficulte: difficulte || "moyen",
          coursId: coursId || null,
          utilisateurId: req.utilisateur.id,
          genereeParIA: true,
        });

        const progression = await Progression.findOne({ where: { utilisateurId: req.utilisateur.id } });
        if (progression) {
          const stats = progression.stats || {};
          stats.quizTotal = (stats.quizTotal || 0) + 1;
          await progression.update({ stats });
        }

        res.write(`data: ${JSON.stringify({ done: true, quizId: quiz.id, quiz: quizData })}\n\n`);
        res.end();
      }
    );
  } catch (error) {
    console.error("Erreur génération quiz IA:", error);
    const msg = "Erreur lors de la génération du quiz. Réessaie.";
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: msg });
    } else {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
  }
};

// POST /api/ai/expliquer
const expliquerConcept = async (req, res) => {
  const client = groq || openai;
  const model = groq ? MODEL_RAPIDE : MODEL_COMPLEX;

  if (!client) {
    return res.status(503).json({ success: false, message: "Service IA temporairement indisponible." });
  }
  try {
    const { concept, contexte, niveauEtude } = req.body;

    if (detecterInjectionPrompt(concept) || detecterInjectionPrompt(contexte)) {
      return res.status(400).json({ success: false, message: "Contenu malveillant détecté." });
    }

    await gererStream(
      res,
      client,
      model,
      [
        {
          role: "system",
          content: `Tu es un professeur bienveillant qui explique les concepts de manière simple et claire.
Niveau de l'étudiant : ${niveauEtude || "licence"}.
Utilise des analogies, des exemples concrets et un langage accessible.`,
        },
        {
          role: "user",
          content: `Explique-moi le concept suivant de façon simple et détaillée :

CONCEPT : ${concept}
${contexte ? `CONTEXTE : ${contexte}` : ""}

Structure ta réponse avec :
1. Une définition simple (1-2 phrases)
2. Une analogie concrète
3. Les points clés à retenir (liste)
4. Un exemple pratique`,
        },
      ],
      async (texteComplet, res) => {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    );
  } catch (error) {
    console.error("Erreur explication IA:", error);
    const msg = "Erreur lors de l'explication. Réessaie.";
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: msg });
    } else {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
  }
};

// POST /api/ai/planning
const genererPlanning = async (req, res) => {
  if (!openai && !groq) {
    return res.status(503).json({ success: false, message: "Service IA temporairement indisponible." });
  }
  try {
    const { cours, dateDebut, dateFin, disponibilite } = req.body;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Génère un planning de révision optimisé. Réponds UNIQUEMENT en JSON :

COURS À RÉVISER : ${JSON.stringify(cours)}
PÉRIODE : du ${dateDebut} au ${dateFin}
DISPONIBILITÉ PAR JOUR : ${disponibilite || "2"} heures

Format JSON :
{
  "planning": [
    {
      "date": "YYYY-MM-DD",
      "matiere": "Nom de la matière",
      "sujet": "Ce qu'il faut réviser",
      "dureeMinutes": 60,
      "priorite": "haute|moyenne|faible",
      "conseils": "Conseil pour cette session"
    }
  ],
  "conseils_generaux": ["Conseil 1", "Conseil 2"]
}`,
      },
    ];

    const essais = [
      { client: openai, model: MODEL_COMPLEX },
      { client: groq, model: MODEL_RAPIDE },
    ].filter(e => e.client);

    let planningData = null;
    let derniereErreur = null;

    for (const essai of essais) {
      try {
        const response = await essai.client.chat.completions.create({
          model: essai.model,
          messages,
        });

        const texte = response.choices[0]?.message?.content || "";
        const jsonNettoye = nettoyerJSON(texte);
        planningData = JSON.parse(jsonNettoye);
        break;
      } catch (err) {
        console.error(`Erreur planning IA (${essai.model}):`, err.message);
        derniereErreur = err;
        if (err.status === 429) continue;
        break;
      }
    }

    if (!planningData) {
      const message = derniereErreur?.status === 429
        ? "Limite de requêtes IA atteinte. Attends quelques instants puis réessaie."
        : "Erreur de connexion au service IA. Réessaie.";
      return res.status(derniereErreur?.status || 500).json({ success: false, message });
    }

    res.json({ success: true, planning: planningData });
  } catch (error) {
    console.error("Erreur génération planning IA:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la génération du planning. Réessaie." });
  }
};

// POST /api/ai/chat
const chat = async (req, res) => {
  const client = groq || openai;
  const model = groq ? MODEL_RAPIDE : MODEL_COMPLEX;

  if (!client) {
    return res.status(503).json({ success: false, message: "Service IA temporairement indisponible." });
  }
  try {
    let { messages, contexte } = req.body;
    let sources = [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages requis." });
    }

    if (detecterInjectionPrompt(contexte) || messages.some((m) => m.role === "user" && detecterInjectionPrompt(m.content))) {
      return res.status(400).json({ success: false, message: "Contenu malveillant détecté." });
    }

    if (!contexte) {
      const derniereQuestion = messages[messages.length - 1].content;
      const ragResult = await rechercherContexte(derniereQuestion, req.utilisateur.id);
      contexte = ragResult.context;
      sources = ragResult.sources;
    }

    const systemMessage = {
      role: "system",
      content: `Tu es un assistant pédagogique expert pour étudiants.
Tu aides à comprendre les cours, expliquer les concepts difficiles et préparer les examens.
${contexte ? `Contexte du cours actuel : ${contexte}` : ""}
Sois précis, encourageant et pédagogique.`,
    };

    const openaiMessages = [
      systemMessage,
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    await gererStream(res, client, model, openaiMessages, null, { sources });
  } catch (error) {
    console.error("Erreur chat IA:", error);
    const msg = "Erreur de connexion à l'assistant. Réessaie.";
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: msg });
    } else {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
  }
};

module.exports = {
  genererFiche,
  genererQuiz,
  expliquerConcept,
  genererPlanning,
  chat,
};