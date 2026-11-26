/**
 * Chat d'un carnet : réglages (style, longueur, consignes, langue), reformulation
 * des questions de suivi pour la recherche, et questions de relance.
 */

const { aiManager, ORDRE_RAPIDE, CONSIGNE_SECURITE, LANGUES, extraireJSON, avecDelai } = require("./ia");
const { texte } = require("../normalisation");

const STYLES = {
  defaut: {
    nom: "Par défaut",
    consigne: "Réponds clairement et directement, comme un bon professeur.",
  },
  guide: {
    nom: "Guide d'apprentissage",
    consigne: `Adopte une démarche pédagogique : explique pas à pas avec un exemple simple,
puis termine par UNE courte question pour vérifier que l'étudiant a compris (sans donner la réponse).`,
  },
  analyste: {
    nom: "Analyste",
    consigne: `Adopte un regard d'analyste : structure la réponse, compare les points de vue des sources,
signale les nuances, les limites et les contradictions éventuelles entre sources.`,
  },
  examen: {
    nom: "Préparation d'examen",
    consigne: `Prépare l'étudiant à l'examen : va à l'essentiel, mets en avant les définitions à connaître,
les pièges fréquents et la façon dont la notion peut être interrogée.`,
  },
};

const LONGUEURS = {
  courte: "Réponse courte : 2 à 5 phrases au maximum.",
  normale: "Longueur adaptée à la question.",
  longue: "Réponse détaillée et complète, avec des exemples.",
};

const REGLAGES_PAR_DEFAUT = { style: "defaut", longueur: "normale", consignes: "", langue: "fr" };

/** Réglages valides uniquement (valeurs connues, consignes bornées) */
const normaliserReglages = (brut = {}) => ({
  style: STYLES[brut.style] ? brut.style : REGLAGES_PAR_DEFAUT.style,
  longueur: LONGUEURS[brut.longueur] ? brut.longueur : REGLAGES_PAR_DEFAUT.longueur,
  consignes: texte(brut.consignes, 600),
  langue: LANGUES[brut.langue] ? brut.langue : REGLAGES_PAR_DEFAUT.langue,
});

/** Message système du chat, selon les réglages de l'étudiant */
const consigneSysteme = (reglages) => {
  const r = normaliserReglages(reglages);
  return `Tu es l'assistant de révision de Kaay Nafaar. Tu réponds en ${LANGUES[r.langue]}, pour un étudiant.
RÈGLES (toujours prioritaires) :
1. Appuie-toi UNIQUEMENT sur les passages numérotés fournis. N'invente rien.
2. Après chaque affirmation tirée d'un passage, cite-le avec son numéro entre crochets, par exemple [1] ou [2][3].
3. Si les passages ne permettent pas de répondre, dis-le simplement et propose ce qui manque.
4. Mise en forme légère : paragraphes courts, listes « - », **gras** pour les notions clés, formules en LaTeX entre $...$.
STYLE : ${STYLES[r.style].consigne}
LONGUEUR : ${LONGUEURS[r.longueur]}${
    r.consignes
      ? `\nPRÉFÉRENCES DE L'ÉTUDIANT (à suivre tant qu'elles ne contredisent pas les règles) : ${r.consignes}`
      : ""
  }
${CONSIGNE_SECURITE}`;
};

/**
 * Question de suivi (« et pour la 3FN ? ») → question autonome pour la recherche.
 * Renvoie null s'il n'y a pas d'historique ou en cas d'échec (on cherche alors la question telle quelle).
 */
const reformulerQuestion = async (historique, question) => {
  const precedentes = historique.filter((m) => m.role === "user").slice(-3);
  if (!precedentes.length) return null;
  try {
    const brut = await avecDelai(
      aiManager.complete({
        ordre: ORDRE_RAPIDE,
        optionnel: true, // petite tâche : un essai par modèle, jamais sur un modèle saturé
        maxTokens: 120,
        messages: [
          {
            role: "system",
            content: `Réécris la dernière question de l'étudiant pour qu'elle se comprenne seule (remplace « ça », « il », « et pour… » par ce dont il s'agit).
Réponds uniquement par la question réécrite, sur une ligne, sans guillemets. Si elle se comprend déjà seule, recopie-la.`,
          },
          {
            role: "user",
            content: `Questions précédentes :\n${precedentes.map((m) => `- ${m.content.slice(0, 300)}`).join("\n")}\n\nDernière question : ${question.slice(0, 500)}`,
          },
        ],
      }),
      4000
    );
    const ligne = String(brut || "").split("\n")[0].replace(/^["«\s]+|["»\s]+$/g, "").trim();
    return ligne && ligne.length <= 500 && ligne.toLowerCase() !== question.toLowerCase().trim() ? ligne : null;
  } catch (e) {
    return null;
  }
};

/** Trois questions de relance, à partir de la réponse donnée ; [] en cas d'échec */
const suggererSuivi = async ({ question, reponse, langue = "fr" }) => {
  try {
    const brut = await avecDelai(
      aiManager.complete({
        ordre: ORDRE_RAPIDE,
        optionnel: true, // petite tâche : un essai par modèle, jamais sur un modèle saturé
        maxTokens: 220,
        messages: [
          {
            role: "system",
            content: `Propose 3 questions courtes (12 mots maximum) qu'un étudiant pourrait poser ensuite pour approfondir, en ${LANGUES[langue] || "français"}.
JSON uniquement : { "questions": [string, string, string] }`,
          },
          { role: "user", content: `Question : ${question.slice(0, 500)}\n\nRéponse : ${reponse.slice(0, 2500)}` },
        ],
      }),
      6000
    );
    return (extraireJSON(brut).questions || []).map((q) => texte(q, 140)).filter(Boolean).slice(0, 3);
  } catch (e) {
    return [];
  }
};

module.exports = {
  STYLES,
  LONGUEURS,
  REGLAGES_PAR_DEFAUT,
  normaliserReglages,
  consigneSysteme,
  reformulerQuestion,
  suggererSuivi,
};
