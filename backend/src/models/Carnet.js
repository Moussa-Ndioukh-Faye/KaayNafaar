const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Carnet : regroupe plusieurs cours (les « sources »), comme un carnet NotebookLM.
 * - coursIds : identifiants des cours de l'étudiant inclus dans le carnet
 * - notes    : notes enregistrées (réponses du chat, notes libres)
 * - studio   : productions générées (synthèse, carte mentale, frise, FAQ, glossaire, podcast)
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
  },
  { tableName: "carnets" }
);

module.exports = Carnet;
