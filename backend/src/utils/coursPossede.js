const Course = require("../models/Course");

/**
 * Renvoie l'identifiant du cours seulement s'il appartient à l'utilisateur,
 * sinon null. Empêche de rattacher une fiche ou un quiz au cours d'un autre
 * étudiant (et donc d'en lire le titre via les inclusions).
 */
const coursPossede = async (coursId, utilisateurId) => {
  const id = Number.parseInt(coursId, 10);
  if (!Number.isSafeInteger(id) || id <= 0 || !utilisateurId) return null;
  const cours = await Course.findOne({ where: { id, utilisateurId }, attributes: ["id"] });
  return cours ? cours.id : null;
};

module.exports = { coursPossede };
