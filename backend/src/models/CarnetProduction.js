const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Production du studio d'un carnet (synthèse, rapport, carte mentale, quiz, audio…).
 * Plusieurs versions d'un même type sont conservées, chacune avec ses options
 * (format, durée, consignes) : on peut comparer, garder la meilleure, supprimer les autres.
 */
const CarnetProduction = sequelize.define(
  "CarnetProduction",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    carnetId: { type: DataTypes.INTEGER, allowNull: false },
    utilisateurId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING(30), allowNull: false },
    titre: { type: DataTypes.STRING(200), allowNull: true },
    options: { type: DataTypes.JSON, defaultValue: {} },
    contenu: { type: DataTypes.JSON, allowNull: false },
  },
  {
    tableName: "carnet_productions",
    indexes: [{ fields: ["carnet_id", "type"] }],
  }
);

module.exports = CarnetProduction;
