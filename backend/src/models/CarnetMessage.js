const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Historique du chat d'un carnet : une ligne par question ou réponse.
 * `passages` garde les extraits cités par la réponse, pour que les citations [n]
 * restent cliquables quand on rouvre le carnet.
 */
const CarnetMessage = sequelize.define(
  "CarnetMessage",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    carnetId: { type: DataTypes.INTEGER, allowNull: false },
    utilisateurId: { type: DataTypes.INTEGER, allowNull: false },
    role: { type: DataTypes.STRING(12), allowNull: false, validate: { isIn: [["user", "assistant"]] } },
    contenu: { type: DataTypes.TEXT, allowNull: false },
    passages: { type: DataTypes.JSON, defaultValue: [] },
    suivi: { type: DataTypes.JSON, defaultValue: [] },
  },
  {
    tableName: "carnet_messages",
    indexes: [{ fields: ["carnet_id", "created_at"] }],
  }
);

module.exports = CarnetMessage;
