const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FeedbackIA = sequelize.define(
  "FeedbackIA",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    type: {
      type: DataTypes.ENUM("chat", "explication", "fiche", "quiz"),
      allowNull: false,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    note: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categorie: {
      type: DataTypes.ENUM("trop_difficile", "incorrect", "trop_long", "utile", "parfait"),
      allowNull: true,
    },
    contenuUser: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contenuAssistant: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "feedbacks_ia",
    timestamps: true,
  }
);

module.exports = FeedbackIA;
