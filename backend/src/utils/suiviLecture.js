/**
 * Suivi de la lecture des cours importés (en mémoire) : l'application affiche
 * « L'IA lit ton document… page 16 sur 40 » au lieu d'un simple « Traitement en cours ».
 */

const EN_TRAITEMENT = "Traitement en cours...";
const AUCUN_TEXTE = "Aucun texte n'a pu être lu dans ce document. Essaie un PDF non protégé ou une photo plus nette.";
const INTERROMPU_APRES_MS = 20 * 60 * 1000; // sans nouvelle depuis 20 min : lecture interrompue (redémarrage)

const suivis = new Map(); // coursId → { etape, pagesLues, total, maj }

const mettreAJour = (coursId, donnees) => {
  suivis.set(Number(coursId), { ...(suivis.get(Number(coursId)) || {}), ...donnees, maj: Date.now() });
};
const terminer = (coursId) => suivis.delete(Number(coursId));

/**
 * État de lecture d'un cours, ajouté aux réponses de l'API
 * @returns {null | { etat: "lecture"|"indexation"|"interrompue"|"echec", pagesLues?, total? }}
 */
const etatLecture = (cours) => {
  const contenu = cours.contenu ?? cours.dataValues?.contenu;
  if (contenu === AUCUN_TEXTE) return { etat: "echec" };
  if (contenu !== EN_TRAITEMENT) return null;
  const suivi = suivis.get(Number(cours.id));
  if (suivi) return { etat: suivi.etape || "lecture", pagesLues: suivi.pagesLues || 0, total: suivi.total || null };
  const cree = new Date(cours.createdAt ?? cours.dataValues?.createdAt ?? Date.now()).getTime();
  return Date.now() - cree > INTERROMPU_APRES_MS ? { etat: "interrompue" } : { etat: "lecture", pagesLues: 0, total: null };
};

/** Ajoute `lecture` à un cours (objet Sequelize ou simple objet) */
const avecEtatLecture = (cours) => {
  const brut = typeof cours.toJSON === "function" ? cours.toJSON() : cours;
  const lecture = etatLecture(cours);
  return lecture ? { ...brut, lecture } : brut;
};

module.exports = { mettreAJour, terminer, etatLecture, avecEtatLecture, EN_TRAITEMENT, AUCUN_TEXTE };
