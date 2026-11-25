/**
 * Studio d'un carnet : définitions des productions, options autorisées, consignes
 * envoyées au modèle et validation stricte de ce qu'il renvoie.
 *
 * Chaque type déclare ses options (première valeur = défaut). Toutes acceptent en plus
 * des consignes libres (« insiste sur les exemples ») et la langue de sortie.
 */

const { texte, normaliserQuestionsQuiz, normaliserFlashcards } = require("../normalisation");
const { LANGUES } = require("./ia");
const audio = require("./audio");

const liste = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

const FORMATS_RAPPORT = {
  guide_etude: {
    nom: "Guide d'étude",
    consigne: `un guide d'étude : objectifs, notions clés expliquées, exemples, erreurs fréquentes,
puis une section « Pour s'entraîner » avec 5 questions courtes et leurs réponses.`,
  },
  briefing: {
    nom: "Document de briefing",
    consigne: `un document de briefing : points essentiels en tête, puis les idées principales, les données
et faits importants, les points de débat ou d'incertitude, et une conclusion.`,
  },
  article: {
    nom: "Article de blog",
    consigne: "un article de blog clair et vivant qui explique le sujet à un étudiant curieux, avec un titre accrocheur.",
  },
  personnalise: {
    nom: "Rapport personnalisé",
    consigne: "le document décrit dans les consignes de l'étudiant.",
  },
};

const TYPES = {
  synthese: {
    nom: "Note de synthèse",
    options: { detail: ["normal", "court", "detaille"] },
    maxTokens: 4096,
    consigne: (o) => `Rédige une note de synthèse structurée des sources (${
      { court: "300 à 450", normal: "500 à 900", detaille: "1 000 à 1 600" }[o.detail]
    } mots).
JSON : { "titre": string, "texte": string }
« texte » utilise : titres "## ", listes "- ", **gras**, formules LaTeX entre $...$.`,
    valider: (j) => ({ titre: texte(j.titre, 160), texte: texte(j.texte, 16000) }),
    estVide: (c) => !c.texte,
  },

  rapport: {
    nom: "Rapport",
    options: { format: Object.keys(FORMATS_RAPPORT) },
    maxTokens: 6000,
    exige: (o) => (o.format === "personnalise" && !o.consignes ? "Décris le rapport voulu dans les consignes." : null),
    consigne: (o) => `Rédige ${FORMATS_RAPPORT[o.format].consigne}
JSON : { "titre": string, "texte": string }
« texte » en Markdown : titres "## ", listes "- ", **gras**, tableaux si utile, formules LaTeX entre $...$.`,
    valider: (j) => ({ titre: texte(j.titre, 160), texte: texte(j.texte, 24000) }),
    estVide: (c) => !c.texte,
    titre: (c, o) => c.titre || FORMATS_RAPPORT[o.format].nom,
  },

  carte_mentale: {
    nom: "Carte mentale",
    options: {},
    maxTokens: 3000,
    consigne: () => `Construis une carte mentale des notions des sources : 4 à 7 branches, chacune avec 2 à 5 sous-notions, et au plus un niveau de plus.
JSON : { "centre": string, "branches": [ { "titre": string, "enfants": [ { "titre": string, "enfants": [ { "titre": string } ] } ] } ] }
Titres courts (6 mots maximum).`,
    valider: (j) => {
      const noeud = (n, profondeur) => ({
        titre: texte(n?.titre, 80),
        enfants:
          profondeur < 3 ? liste(n?.enfants, 8).map((e) => noeud(e, profondeur + 1)).filter((e) => e.titre) : [],
      });
      return { centre: texte(j.centre, 80), branches: liste(j.branches, 8).map((b) => noeud(b, 1)).filter((b) => b.titre) };
    },
    estVide: (c) => !c.branches.length,
    titre: (c) => c.centre,
  },

  frise: {
    nom: "Frise et étapes",
    options: {},
    maxTokens: 3000,
    consigne: () => `Extrais la chronologie des sources (dates, périodes) ; s'il n'y a pas de dates, extrais les grandes étapes dans l'ordre logique.
JSON : { "titre": string, "elements": [ { "repere": string, "titre": string, "description": string } ] }
« repere » : une date, une période ou « Étape 1 », « Étape 2 »… 5 à 15 éléments.`,
    valider: (j) => ({
      titre: texte(j.titre, 160),
      elements: liste(j.elements, 20)
        .map((e) => ({ repere: texte(e?.repere, 60), titre: texte(e?.titre, 120), description: texte(e?.description, 600) }))
        .filter((e) => e.titre),
    }),
    estVide: (c) => !c.elements.length,
  },

  faq: {
    nom: "Questions fréquentes",
    options: {},
    maxTokens: 4096,
    consigne: () => `Écris 8 à 12 questions qu'un examinateur pourrait poser sur les sources, avec une réponse précise (2 à 4 phrases).
JSON : { "questions": [ { "question": string, "reponse": string } ] }`,
    valider: (j) => ({
      questions: liste(j.questions, 15)
        .map((q) => ({ question: texte(q?.question, 300), reponse: texte(q?.reponse, 1500) }))
        .filter((q) => q.question && q.reponse),
    }),
    estVide: (c) => !c.questions.length,
  },

  glossaire: {
    nom: "Glossaire",
    options: {},
    maxTokens: 4096,
    consigne: () => `Dresse le glossaire des termes techniques des sources (10 à 30 termes), avec une définition claire d'une ou deux phrases. Ordre alphabétique.
JSON : { "termes": [ { "terme": string, "definition": string } ] }`,
    valider: (j) => ({
      termes: liste(j.termes, 40)
        .map((t) => ({ terme: texte(t?.terme, 100), definition: texte(t?.definition, 600) }))
        .filter((t) => t.terme && t.definition)
        .sort((a, b) => a.terme.localeCompare(b.terme, "fr")),
    }),
    estVide: (c) => !c.termes.length,
  },

  flashcards: {
    nom: "Flashcards",
    options: { nombre: ["20", "10", "30"] },
    maxTokens: 6000,
    consigne: (o) => `Crée ${o.nombre} flashcards pour mémoriser les sources : une question précise au recto,
une réponse courte et exacte au verso (une notion par carte, des plus importantes aux plus fines).
JSON : { "titre": string, "cartes": [ { "question": string, "reponse": string } ] }`,
    valider: (j, o) => ({ titre: texte(j.titre, 160), cartes: normaliserFlashcards(j.cartes, Number(o.nombre)) }),
    estVide: (c) => c.cartes.length < 3,
  },

  quiz: {
    nom: "Quiz",
    options: { nombre: ["10", "5", "15", "20"], difficulte: ["moyen", "facile", "difficile"] },
    maxTokens: 6000,
    consigne: (o) => `Crée un QCM de ${o.nombre} questions de difficulté « ${o.difficulte} » sur les sources.
Chaque question a 4 options plausibles, une seule bonne réponse, et une explication d'une ou deux phrases.
JSON : { "titre": string, "questions": [ { "question": string, "options": [string, string, string, string], "reponseCorrecte": string, "explication": string } ] }
« reponseCorrecte » recopie exactement le texte de la bonne option.`,
    valider: (j, o) => ({ titre: texte(j.titre, 160), questions: normaliserQuestionsQuiz(j.questions, Number(o.nombre)) }),
    estVide: (c) => c.questions.length < 3,
  },

  podcast: {
    nom: "Résumé audio",
    options: audio.OPTIONS,
    maxTokens: 8000,
    consigne: audio.consigneScript,
    valider: audio.validerScript,
    estVide: (c) => c.repliques.length < 4,
  },
};

/** Options valides du type (valeurs connues uniquement) + consignes et langue */
const normaliserOptions = (type, brut = {}) => {
  const def = TYPES[type];
  const options = {};
  for (const [cle, valeurs] of Object.entries(def.options)) {
    const v = String(brut[cle] ?? "");
    options[cle] = valeurs.includes(v) ? v : valeurs[0];
  }
  options.consignes = texte(brut.consignes, 600);
  options.langue = LANGUES[brut.langue] ? brut.langue : "fr";
  return options;
};

/** Consigne complète envoyée au modèle */
const consigneComplete = (type, options) => {
  const def = TYPES[type];
  return `${def.consigne(options)}${
    options.consignes ? `\n\nCONSIGNES DE L'ÉTUDIANT (à respecter si elles ne contredisent pas le format JSON) : ${options.consignes}` : ""
  }`;
};

const titreProduction = (type, contenu, options) =>
  texte((TYPES[type].titre ? TYPES[type].titre(contenu, options) : contenu.titre) || TYPES[type].nom, 200);

module.exports = { TYPES, FORMATS_RAPPORT, normaliserOptions, consigneComplete, titreProduction };
