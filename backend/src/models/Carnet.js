const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Carnet : regroupe plusieurs cours (les « sources »), comme un carnet NotebookLM.
 * - coursIds : identifiants des cours de l'étudiant inclus dans le carnet
 * - notes    : notes enregistrées (réponses du chat, notes libres)
 * - studio   : anciennes productions (avant l'historique) — lues par compatibilité
 * - guide    : guide du carnet (résumé, sujets, questions suggérées) et son empreinte
 * - reglages : réglages du chat (style, longueur, consignes, langue)
 * Historique du chat : CarnetMessage ; productions du studio : CarnetProduction.
 */
const Carnet = sequelize.define(
  "Carnet",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    utilisateurId: { type: DataTypes.INTEGER, allowNull: false },
    titre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: { msg: "Le titre est requis" }, len: [1, 120] },
    },
    description: { type: DataTypes.STRING(500), allowNull: true },
    coursIds: { type: DataTypes.JSON, defaultValue: [] },
    notes: { type: DataTypes.JSON, defaultValue: [] },
    studio: { type: DataTypes.JSON, defaultValue: {} },
    guide: { type: DataTypes.JSON, defaultValue: {} },
    reglages: { type: DataTypes.JSON, defaultValue: {} },
  },
  { tableName: "carnets" }
);

module.exports = Carnet;
