/**
 * Résumé audio d'un carnet : script à deux voix (Awa et Moussa), lu par la synthèse
 * vocale de l'appareil.
 *
 * - Formats : approfondi, bref, critique, débat.
 * - Durées : courte, normale, longue.
 * - Mode interactif : l'étudiant interrompt l'écoute pour poser une question ;
 *   les deux voix lui répondent à partir des passages du carnet, puis reprennent.
 */

const { texte } = require("../normalisation");
const { demanderJSON, ORDRE_QUALITE } = require("./ia");

const VOIX = ["Awa", "Moussa"];

const FORMATS = {
  approfondi: {
    nom: "Approfondi",
    consigne: `une discussion approfondie : Awa (l'animatrice) pose les questions et relance, Moussa (le spécialiste)
explique avec des exemples simples ; ils relient les idées entre elles et terminent par une récapitulation.`,
  },
  bref: {
    nom: "Bref",
    consigne: "un résumé express : les idées essentielles seulement, sans digression, puis une phrase de récapitulation.",
  },
  critique: {
    nom: "Critique",
    consigne: `une revue critique et bienveillante des sources : points forts, points faibles, ce qui manque,
ce qui est discutable, et comment l'étudiant pourrait approfondir.`,
  },
  debat: {
    nom: "Débat",
    consigne: `un débat : Awa et Moussa défendent deux points de vue différents sur les questions que posent les sources,
avec des arguments tirés des sources, puis concluent sur ce qui fait consensus.`,
  },
};

const DUREES = {
  courte: { nom: "Courte", minutes: "2 à 3", repliques: "10 à 16" },
  normale: { nom: "Normale", minutes: "5 à 7", repliques: "20 à 32" },
  longue: { nom: "Longue", minutes: "10 à 12", repliques: "36 à 50" },
};

// Première valeur = valeur par défaut
const OPTIONS = { format: Object.keys(FORMATS), duree: ["normale", "courte", "longue"] };

const consigneScript = (o) => {
  const duree = DUREES[o.duree];
  return `Écris le script d'un podcast de révision (${duree.minutes} minutes à l'oral) entre deux voix, « Awa » et « Moussa » :
${FORMATS[o.format].consigne}
Langue orale et naturelle, phrases courtes, aucune formule LaTeX ni symbole (dis les formules en toutes lettres).
JSON : { "titre": string, "repliques": [ { "voix": "Awa" | "Moussa", "texte": string } ] }
${duree.repliques} répliques.`;
};

/** Seules deux voix existent ; une voix inconnue prend le tour de parole suivant */
const normaliserRepliques = (repliques, max) =>
  (Array.isArray(repliques) ? repliques : [])
    .slice(0, max)
    .map((r) => ({ voix: r?.voix, texte: texte(r?.texte, 900) }))
    .filter((r) => r.texte)
    .reduce((acc, r, i) => {
      const precedente = acc[i - 1]?.voix;
      acc.push({ voix: VOIX.includes(r.voix) ? r.voix : precedente === "Awa" ? "Moussa" : "Awa", texte: r.texte });
      return acc;
    }, []);

const validerScript = (j) => ({ titre: texte(j.titre, 160), repliques: normaliserRepliques(j.repliques, 60) });

/**
 * Intervention de l'étudiant pendant l'écoute.
 * @param {{ question: string, contexte: Array<{voix, texte}>, passages: string, langue?: string }} p
 *   contexte : les dernières répliques entendues ; passages : extraits numérotés du carnet
 * @returns {Promise<Array<{voix, texte}>>} 2 à 5 répliques
 */
const repondreIntervention = async ({ question, contexte, passages, langue = "fr" }) => {
  const j = await demanderJSON({
    role: "Tu écris les répliques d'un podcast de révision animé par Awa et Moussa.",
    ordre: ORDRE_QUALITE,
    maxTokens: 1200,
    langue,
    consigne: `Un auditeur (l'étudiant) interrompt le podcast avec une question.
Écris 2 à 5 répliques : Awa accueille la question en une phrase, Moussa y répond à partir des sources
(sans inventer ; si les sources ne permettent pas de répondre, il le dit), puis Awa propose de reprendre là où ils en étaient.
Oral naturel, aucune formule LaTeX ni symbole.
JSON : { "repliques": [ { "voix": "Awa" | "Moussa", "texte": string } ] }

Ce qui vient d'être dit :
${contexte.map((r) => `${r.voix} : ${r.texte}`).join("\n").slice(0, 2500)}

Question de l'auditeur : ${question}`,
    sources: passages,
  });
  return normaliserRepliques(j.repliques, 6);
};

module.exports = { FORMATS, DUREES, OPTIONS, VOIX, consigneScript, validerScript, normaliserRepliques, repondreIntervention };
