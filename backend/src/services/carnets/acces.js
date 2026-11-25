/**
 * Accès aux carnets : toujours par identifiant ET propriétaire.
 */

const Carnet = require("../../models/Carnet");

const erreur = (res, status, message) => res.status(status).json({ success: false, message });

/** Le carnet demandé, seulement s'il appartient à l'étudiant connecté (sinon null) */
const trouverCarnet = (req) => Carnet.findOne({ where: { id: req.params.id, utilisateurId: req.utilisateur.id } });

/** Sources sur lesquelles travailler : celles choisies par l'étudiant, parmi celles du carnet */
const sourcesChoisies = (carnet, demandees) => {
  const duCarnet = carnet.coursIds || [];
  if (!Array.isArray(demandees) || !demandees.length) return duCarnet;
  const choix = demandees.map(Number).filter((id) => duCarnet.includes(id));
  return choix.length ? choix : duCarnet;
};

module.exports = { erreur, trouverCarnet, sourcesChoisies };
