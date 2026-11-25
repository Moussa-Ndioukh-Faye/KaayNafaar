/**
 * Carnets — guide et chat avec citations.
 *
 * Chat : la question (reformulée si c'est une question de suivi) sert à chercher des
 * passages dans les sources choisies ; la réponse arrive en flux SSE :
 *   { passages } → { delta }… → { suivi } → { done, messageId }
 * L'échange est enregistré (historique), avec les passages cités.
 */

const CarnetMessage = require("../models/CarnetMessage");
const { rechercherPassages, formaterPassages } = require("../utils/passages");
const { aiManager, ORDRE_QUALITE } = require("../services/carnets/ia");
const { consigneSysteme, normaliserReglages, reformulerQuestion, suggererSuivi } = require("../services/carnets/chat");
const { obtenirGuide } = require("../services/carnets/guide");
const { texte } = require("../services/normalisation");
const { erreur, trouverCarnet, sourcesChoisies } = require("../services/carnets/acces");

const HISTORIQUE_IA = 8; // messages précédents envoyés au modèle
const HISTORIQUE_AFFICHE = 60;
const PASSAGES_PAR_REPONSE = 8;
const AUCUN_PASSAGE =
  "Je ne trouve rien sur ce sujet dans les sources choisies. Ajoute un cours qui en parle, ou reformule ta question.";

// GET /api/carnets/:id/guide  (?forcer=1 pour régénérer)
const guideCarnet = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    const guide = await obtenirGuide(carnet, { forcer: req.query.forcer === "1" });
    res.json({ success: true, guide });
  } catch (e) {
    console.error("guideCarnet:", e.message);
    erreur(res, 502, "Le guide du carnet n'a pas pu être préparé. Réessaie dans un instant.");
  }
};

// GET /api/carnets/:id/messages
const listerMessages = async (req, res) => {
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");
  const messages = await CarnetMessage.findAll({
    where: { carnetId: carnet.id, utilisateurId: req.utilisateur.id },
    order: [["createdAt", "DESC"], ["id", "DESC"]],
    limit: HISTORIQUE_AFFICHE,
  });
  res.json({ success: true, messages: messages.reverse().map((m) => m.toJSON()) });
};

// DELETE /api/carnets/:id/messages  (effacer la conversation)
const effacerMessages = async (req, res) => {
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");
  await CarnetMessage.destroy({ where: { carnetId: carnet.id, utilisateurId: req.utilisateur.id } });
  res.json({ success: true });
};

// POST /api/carnets/:id/chat  { question, coursIds? }  → flux SSE
const chatCarnet = async (req, res) => {
  if (!aiManager.estDisponible()) return erreur(res, 503, "Service IA indisponible.");
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");

  // Compatibilité : anciens clients qui envoyaient tout l'historique dans `messages`
  const derniere = Array.isArray(req.body?.messages) ? req.body.messages.at(-1) : null;
  const question = texte(req.body?.question ?? (derniere?.role === "user" ? derniere.content : ""), 4000);
  if (!question) return erreur(res, 400, "Pose une question.");
  if (!(carnet.coursIds || []).length) return erreur(res, 400, "Ajoute au moins une source à ce carnet.");

  const userId = req.utilisateur.id;
  const reglages = normaliserReglages(carnet.reglages);
  const historique = (
    await CarnetMessage.findAll({
      where: { carnetId: carnet.id, utilisateurId: userId },
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit: HISTORIQUE_IA,
      attributes: ["role", "contenu"],
    })
  )
    .reverse()
    .map((m) => ({ role: m.role, content: m.contenu.slice(0, 4000) }));

  const reformulee = await reformulerQuestion(historique, question);
  const passages = await rechercherPassages({
    question,
    questionsAlternatives: reformulee ? [reformulee] : [],
    userId,
    coursIds: sourcesChoisies(carnet, req.body?.coursIds),
    k: PASSAGES_PAR_REPONSE,
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  let interrompu = false;
  req.on("close", () => {
    interrompu = true;
  });
  const envoyer = (objet) => {
    if (!interrompu) res.write(`data: ${JSON.stringify(objet)}\n\n`);
  };

  const enregistrer = async (reponse, suivi = []) => {
    await CarnetMessage.create({ carnetId: carnet.id, utilisateurId: userId, role: "user", contenu: question });
    return CarnetMessage.create({
      carnetId: carnet.id,
      utilisateurId: userId,
      role: "assistant",
      contenu: reponse,
      passages,
      suivi,
    });
  };

  // Les passages partent d'abord : l'interface peut rendre les citations [n] cliquables
  envoyer({ passages });

  if (!passages.length) {
    envoyer({ delta: AUCUN_PASSAGE });
    const message = await enregistrer(AUCUN_PASSAGE).catch(() => null);
    envoyer({ done: true, messageId: message?.id });
    return res.end();
  }

  await aiManager.streamComplete({
    ordre: ORDRE_QUALITE,
    maxTokens: reglages.longueur === "longue" ? 3500 : 2048,
    messages: [
      { role: "system", content: consigneSysteme(reglages) },
      ...historique,
      { role: "user", content: `<sources>\n${formaterPassages(passages)}\n</sources>\n\nQUESTION : ${question}` },
    ],
    onDelta: (delta) => envoyer({ delta }),
    onDone: async (reponse) => {
      try {
        const suivi = await suggererSuivi({ question, reponse, langue: reglages.langue });
        if (suivi.length) envoyer({ suivi });
        const message = await enregistrer(reponse, suivi);
        envoyer({ done: true, messageId: message.id });
      } catch (e) {
        console.error("chatCarnet (enregistrement):", e.message);
        envoyer({ done: true });
      }
      res.end();
    },
    onError: (message) => {
      envoyer({ error: message });
      res.end();
    },
  });
};

module.exports = { guideCarnet, listerMessages, effacerMessages, chatCarnet };
