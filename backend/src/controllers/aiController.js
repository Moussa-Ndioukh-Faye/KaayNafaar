/**
 * Contrôleur IA — Appels à l'API Claude (Anthropic)
 * Utilise le modèle claude-opus-4-6 avec streaming
 */

const Anthropic = require("@anthropic-ai/sdk");
const Course = require("../models/Course");
const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const Progression = require("../models/Progression");

// Initialisation du client Anthropic
const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Prompt système commun pour tous les appels
const SYSTEM_PROMPT = `Tu es un professeur expert et assistant d'étude pour étudiants en génie logiciel et systèmes d'information.
Tu dois répondre UNIQUEMENT en JSON valide, sans texte avant ou après.
Sois précis, pédagogique et adapte ton langage au niveau étudiant.`;

/**
 * POST /api/ai/generer-fiche
 * Génère une fiche de révision complète à partir d'un texte de cours
 */
const genererFiche = async (req, res) => {
  try {
    const { contenuCours, titreCours, coursId } = req.body;

    if (!contenuCours) {
      return res
        .status(400)
        .json({ success: false, message: "Le contenu du cours est requis." });
    }
    if (contenuCours.length > 50000) {
      return res.status(400).json({ success: false, message: "Contenu trop long (max 50 000 caractères)." });
    }

    // Activer le streaming SSE pour l'interface
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let ficheJSON = "";

    // Appel Claude avec streaming
    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
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
    {"question": "...", "reponse": "..."},
    {"question": "...", "reponse": "..."},
    {"question": "...", "reponse": "..."},
    {"question": "...", "reponse": "..."}
  ],
  "diagrammes": ["Suggestion de schéma 1", "Suggestion de schéma 2"],
  "conseilsRevision": ["Conseil 1", "Conseil 2", "Conseil 3"]
}`,
        },
      ],
    });

    // Streamer les tokens au client
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        ficheJSON += event.delta.text;
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`);
      }
    }

    // Finaliser et parser le JSON
    const messageFinale = await stream.finalMessage();
    const texteComplet = messageFinale.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    let ficheData;
    try {
      // Nettoyer les éventuels blocs markdown
      const jsonNettoye = texteComplet
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      ficheData = JSON.parse(jsonNettoye);
    } catch (parseError) {
      res.write(
        `data: ${JSON.stringify({ error: "Erreur de parsing JSON" })}\n\n`
      );
      res.end();
      return;
    }

    // Sauvegarder la fiche en base de données
    const fiche = await Fiche.create({
      titre: ficheData.titre || titreCours || "Fiche générée",
      cours: coursId || null,
      utilisateur: req.utilisateur._id,
      contenu: {
        resume: ficheData.resume,
        conceptsCles: ficheData.conceptsCles,
        explications: ficheData.explications,
        pointsImportants: ficheData.pointsImportants,
      },
      flashcards: ficheData.flashcards || [],
      genereeParIA: true,
    });

    // Mettre à jour la progression
    await Progression.findOneAndUpdate(
      { utilisateur: req.utilisateur._id },
      { $inc: { "stats.fichesTotal": 1 } }
    );

    // Envoyer l'événement final avec l'ID de la fiche sauvegardée
    res.write(
      `data: ${JSON.stringify({
        done: true,
        ficheId: fiche._id,
        fiche: ficheData,
      })}\n\n`
    );
    res.end();
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

/**
 * POST /api/ai/generer-quiz
 * Génère un quiz avec questions QCM à partir d'un cours
 */
const genererQuiz = async (req, res) => {
  try {
    const { contenuCours, titreCours, nombreQuestions, difficulte, coursId } =
      req.body;

    if (!contenuCours) {
      return res.status(400).json({ success: false, message: "Le contenu du cours est requis." });
    }
    if (contenuCours.length > 50000) {
      return res.status(400).json({ success: false, message: "Contenu trop long (max 50 000 caractères)." });
    }

    const n = Math.min(Math.max(parseInt(nombreQuestions) || 5, 1), 20);

    // SSE headers AVANT le stream — bonne pratique
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
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
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`);
      }
    }

    const texteComplet = (await stream.finalMessage()).content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonNettoye = texteComplet
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let quizData;
    try {
      quizData = JSON.parse(jsonNettoye);
    } catch (_) {
      res.write(`data: ${JSON.stringify({ error: "Réponse IA invalide. Réessaie." })}\n\n`);
      res.end();
      return;
    }

    // Sauvegarder en base de données
    const quiz = await Quiz.create({
      titre: quizData.titre,
      matiere: titreCours || "",
      questions: quizData.questions,
      difficulte: difficulte || "moyen",
      cours: coursId || null,
      utilisateur: req.utilisateur._id,
      genereeParIA: true,
    });

    await Progression.findOneAndUpdate(
      { utilisateur: req.utilisateur._id },
      { $inc: { "stats.quizTotal": 1 } }
    );

    res.write(
      `data: ${JSON.stringify({ done: true, quizId: quiz._id, quiz: quizData })}\n\n`
    );
    res.end();
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

/**
 * POST /api/ai/expliquer
 * Demande une explication simple d'un concept (stream temps réel)
 */
const expliquerConcept = async (req, res) => {
  try {
    const { concept, contexte, niveauEtude } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      system: `Tu es un professeur bienveillant qui explique les concepts de manière simple et claire.
Niveau de l'étudiant : ${niveauEtude || "licence"}.
Utilise des analogies, des exemples concrets et un langage accessible.`,
      messages: [
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
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
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

/**
 * POST /api/ai/planning
 * Génère un planning de révision personnalisé
 */
const genererPlanning = async (req, res) => {
  try {
    const { cours, dateDebut, dateFin, disponibilite } = req.body;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
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
      ],
    });

    const texte = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const jsonNettoye = texte
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const planningData = JSON.parse(jsonNettoye);

    res.json({ success: true, planning: planningData });
  } catch (error) {
    console.error("Erreur génération planning IA:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la génération du planning. Réessaie." });
  }
};

/**
 * POST /api/ai/chat
 * Chat avec l'assistant IA (streaming)
 */
const chat = async (req, res) => {
  try {
    const { messages, contexte } = req.body;

    // Validation : limiter le nombre de messages et la taille totale
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages requis." });
    }
    if (messages.length > 50) {
      return res.status(400).json({ success: false, message: "Trop de messages (max 50)." });
    }
    const tailleTotal = messages.reduce((acc, m) => acc + (String(m.content || "").length), 0);
    if (tailleTotal > 100000) {
      return res.status(400).json({ success: false, message: "Contenu trop volumineux." });
    }
    const rolesValides = ["user", "assistant"];
    if (messages.some((m) => !rolesValides.includes(m.role))) {
      return res.status(400).json({ success: false, message: "Rôle de message invalide." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      system: `Tu es un assistant pédagogique expert pour étudiants.
Tu aides à comprendre les cours, expliquer les concepts difficiles et préparer les examens.
${contexte ? `Contexte du cours actuel : ${contexte}` : ""}
Sois précis, encourageant et pédagogique.`,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
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
