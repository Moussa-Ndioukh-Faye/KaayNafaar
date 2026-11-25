/**
 * Normalisation des contenus produits par l'IA vers les formats des modules existants.
 *
 * Le lecteur de quiz attend : { type: "qcm", question, options[], reponseCorrecte, explication }.
 * Les modèles renvoient souvent d'autres formes (answers/correct, choix/bonne_reponse…) :
 * sans normalisation, la question s'affichait en réponse libre et n'était jamais comptée juste.
 */

const texte = (v, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");

/** Une question de QCM, quel que soit le format renvoyé par le modèle ; null si inutilisable */
const normaliserQuestionQuiz = (q) => {
  if (!q || typeof q !== "object") return null;
  const enonce = texte(q.question || q.enonce || q.intitule, 500);
  const options = (Array.isArray(q.options) ? q.options : Array.isArray(q.answers) ? q.answers : Array.isArray(q.choix) ? q.choix : [])
    .map((o) => texte(typeof o === "object" && o ? o.texte || o.text || o.label : o, 300))
    .filter(Boolean)
    .slice(0, 6);
  if (!enonce || options.length < 2 || new Set(options).size !== options.length) return null;

  // Bonne réponse : texte exact, lettre (« B »), ou index (0 ou 1-based selon le modèle)
  const brute = q.reponseCorrecte ?? q.bonneReponse ?? q.bonne_reponse ?? q.reponse ?? q.answer ?? q.correct;
  let reponseCorrecte = null;
  if (typeof brute === "number" && Number.isInteger(brute)) {
    reponseCorrecte = options[brute] ?? null;
  } else if (typeof brute === "string") {
    const b = brute.trim();
    reponseCorrecte =
      options.find((o) => o.toLowerCase() === b.toLowerCase()) ||
      (/^[A-Fa-f]$/.test(b) ? options[b.toUpperCase().charCodeAt(0) - 65] : null) ||
      (/^\d$/.test(b) ? options[Number(b)] : null) ||
      null;
  }
  if (!reponseCorrecte) return null;

  return {
    type: "qcm",
    question: enonce,
    options,
    reponseCorrecte,
    explication: texte(q.explication || q.explanation || q.justification, 800),
  };
};

const normaliserQuestionsQuiz = (questions, max = 30) =>
  (Array.isArray(questions) ? questions : []).map(normaliserQuestionQuiz).filter(Boolean).slice(0, max);

const normaliserFlashcards = (cartes, max = 60) =>
  (Array.isArray(cartes) ? cartes : [])
    .map((c) => ({
      question: texte(c?.question || c?.recto || c?.front, 400),
      reponse: texte(c?.reponse || c?.verso || c?.back || c?.answer, 1200),
    }))
    .filter((c) => c.question && c.reponse)
    .slice(0, max);

module.exports = { texte, normaliserQuestionQuiz, normaliserQuestionsQuiz, normaliserFlashcards };
