const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/dbMysql");

const Fiche = sequelize.define(
  "Fiche",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    coursId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "courses",
        key: "id",
      },
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    resume: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    conceptsCles: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    explications: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    pointsImportants: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    flashcards: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    matiere: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    couleur: {
      type: DataTypes.STRING,
      defaultValue: "#6366f1",
    },
    genereeParIA: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    estPublique: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "fiches",
  }
);

module.exports = Fiche;