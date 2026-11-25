/**
 * Carnets — studio : génération de productions (avec options et consignes), historique
 * des versions, export vers les modules Fiches et Quiz, et questions pendant l'audio.
 */

const CarnetProduction = require("../models/CarnetProduction");
const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const { TYPES, normaliserOptions, consigneComplete, titreProduction } = require("../services/carnets/studio");
const { repondreIntervention } = require("../services/carnets/audio");
const { aiManager, demanderJSON } = require("../services/carnets/ia");
const { texteDesSources } = require("../services/carnets/sources");
const { rechercherPassages, formaterPassages } = require("../utils/passages");
const { texte } = require("../services/normalisation");
const { erreur, trouverCarnet, sourcesChoisies } = require("../services/carnets/acces");

const PRODUCTIONS_MAX = 60;
const ROLE = "Tu es un professeur qui prépare des supports de révision de grande qualité.";

const trouverProduction = (req, carnet) =>
  CarnetProduction.findOne({ where: { id: req.params.pid, carnetId: carnet.id, utilisateurId: req.utilisateur.id } });

// POST /api/carnets/:id/studio  { type, options?, coursIds? }
const genererProduction = async (req, res) => {
  const type = req.body?.type;
  const def = TYPES[type];
  if (!def) return erreur(res, 400, "Type de production inconnu.");
  if (!aiManager.estDisponible()) return erreur(res, 503, "Service IA indisponible.");

  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");

    const options = normaliserOptions(type, req.body.options);
    const manque = def.exige?.(options);
    if (manque) return erreur(res, 400, manque);

    const nombre = await CarnetProduction.count({ where: { carnetId: carnet.id, utilisateurId: req.utilisateur.id } });
    if (nombre >= PRODUCTIONS_MAX) return erreur(res, 400, "Ce carnet a atteint 60 productions : supprimes-en quelques-unes.");

    const coursIds = sourcesChoisies(carnet, req.body.coursIds);
    const sources = await texteDesSources(carnet, { coursIds });
    if (!sources) return erreur(res, 400, "Ajoute au moins une source avec du texte à ce carnet.");

    const contenu = def.valider(
      await demanderJSON({ role: ROLE, consigne: consigneComplete(type, options), sources, maxTokens: def.maxTokens, langue: options.langue }),
      options
    );
    if (def.estVide(contenu)) return erreur(res, 502, `La génération « ${def.nom} » n'a rien donné d'exploitable. Réessaie.`);

    const production = await CarnetProduction.create({
      carnetId: carnet.id,
      utilisateurId: req.utilisateur.id,
      type,
      titre: titreProduction(type, contenu, options),
      options: { ...options, coursIds },
      contenu,
    });
    carnet.changed("updatedAt", true);
    await carnet.save();
    res.status(201).json({ success: true, production: production.toJSON() });
  } catch (e) {
    console.error("genererProduction:", e.message);
    erreur(res, 502, `La génération « ${def.nom} » a échoué. Réessaie dans un instant.`);
  }
};

// DELETE /api/carnets/:id/productions/:pid
const supprimerProduction = async (req, res) => {
  const carnet = await trouverCarnet(req);
  if (!carnet) return erreur(res, 404, "Carnet introuvable.");
  const production = await trouverProduction(req, carnet);
  if (!production) return erreur(res, 404, "Production introuvable.");
  await production.destroy();
  res.json({ success: true });
};

// POST /api/carnets/:id/productions/:pid/exporter — flashcards → Mes fiches, quiz → Mes quiz
const exporterProduction = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    const production = await trouverProduction(req, carnet);
    if (!production) return erreur(res, 404, "Production introuvable.");
    const { contenu, type } = production;

    if (type === "flashcards") {
      const fiche = await Fiche.create({
        titre: production.titre || `Flashcards — ${carnet.titre}`,
        resume: `Flashcards créées depuis le carnet « ${carnet.titre} ».`,
        flashcards: contenu.cartes,
        matiere: carnet.titre,
        genereeParIA: true,
        utilisateurId: req.utilisateur.id,
      });
      return res.status(201).json({ success: true, vers: "fiche", id: fiche.id, message: "Ajoutées à Mes fiches (révision espacée)." });
    }
    if (type === "quiz") {
      const quiz = await Quiz.create({
        titre: production.titre || `Quiz — ${carnet.titre}`,
        questions: contenu.questions,
        matiere: carnet.titre,
        difficulte: production.options?.difficulte || "moyen",
        dureeMinutes: Math.max(5, contenu.questions.length),
        genereeParIA: true,
        utilisateurId: req.utilisateur.id,
      });
      return res.status(201).json({ success: true, vers: "quiz", id: quiz.id, message: "Ajouté à Mes quiz (noté sur 20)." });
    }
    erreur(res, 400, "Seuls les flashcards et les quiz peuvent être exportés.");
  } catch (e) {
    console.error("exporterProduction:", e.message);
    erreur(res, 500, "L'export a échoué.");
  }
};

// POST /api/carnets/:id/productions/:pid/intervention  { question, position }
// Mode interactif du résumé audio : les deux voix répondent à la question de l'auditeur.
const intervenirAudio = async (req, res) => {
  try {
    const carnet = await trouverCarnet(req);
    if (!carnet) return erreur(res, 404, "Carnet introuvable.");
    const production = await trouverProduction(req, carnet);
    if (!production || production.type !== "podcast") return erreur(res, 404, "Résumé audio introuvable.");
    const question = texte(req.body?.question, 500);
    if (!question) return erreur(res, 400, "Pose ta question.");

    const repliques = production.contenu?.repliques || [];
    const position = Math.min(Math.max(Number.parseInt(req.body.position, 10) || 0, 0), Math.max(repliques.length - 1, 0));
    const passages = await rechercherPassages({
      question,
      userId: req.utilisateur.id,
      coursIds: sourcesChoisies(carnet, production.options?.coursIds),
      k: 5,
    });
    const reponse = await repondreIntervention({
      question,
      contexte: repliques.slice(Math.max(0, position - 3), position + 1),
      passages: formaterPassages(passages) || "(aucun passage trouvé)",
      langue: production.options?.langue,
    });
    if (!reponse.length) return erreur(res, 502, "Pas de réponse pour le moment. Réessaie.");
    res.json({ success: true, repliques: reponse });
  } catch (e) {
    console.error("intervenirAudio:", e.message);
    erreur(res, 502, "Impossible de répondre à ta question pour le moment.");
  }
};

module.exports = { genererProduction, supprimerProduction, exporterProduction, intervenirAudio };
