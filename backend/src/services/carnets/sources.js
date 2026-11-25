/**
 * Accès aux sources (cours) d'un carnet — toujours filtré par propriétaire.
 */

const Course = require("../../models/Course");

const MAX_CARACTERES = 24000; // budget de texte envoyé aux modèles gratuits
const TEXTES_VIDES = [/^Traitement en cours/i, /^Aucun texte n'a pu être lu/i];

const aDuTexte = (c) => Boolean(c.contenu) && !TEXTES_VIDES.some((r) => r.test(c.contenu));

/** Cours du carnet appartenant à l'étudiant */
const coursDuCarnet = (carnet, attributs = ["id", "titre", "matiere", "contenu", "resumeIA", "conceptsCles", "updatedAt"]) =>
  carnet.coursIds?.length
    ? Course.findAll({ where: { id: carnet.coursIds, utilisateurId: carnet.utilisateurId }, attributes: attributs })
    : Promise.resolve([]);

/**
 * Texte des sources, réparti équitablement entre les cours et borné.
 * @param {object} carnet
 * @param {{ max?: number, coursIds?: number[] }} options  coursIds : limiter à certaines sources
 */
const texteDesSources = async (carnet, { max = MAX_CARACTERES, coursIds = null } = {}) => {
  let cours = (await coursDuCarnet(carnet)).filter(aDuTexte);
  if (Array.isArray(coursIds) && coursIds.length) cours = cours.filter((c) => coursIds.includes(c.id));
  if (!cours.length) return "";
  const parCours = Math.floor(max / cours.length);
  return cours.map((c) => `### ${c.titre}\n${c.contenu.slice(0, parCours)}`).join("\n\n");
};

module.exports = { coursDuCarnet, texteDesSources, aDuTexte, MAX_CARACTERES };
