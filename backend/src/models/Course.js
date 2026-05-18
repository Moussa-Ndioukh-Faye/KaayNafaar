const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Course = sequelize.define(
  "Course",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    titre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Le titre est requis" },
      },
    },
    matiere: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contenu: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    resumeIA: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    conceptsCles: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    niveau: {
      type: DataTypes.ENUM("débutant", "intermédiaire", "avancé"),
      defaultValue: "intermédiaire",
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    fichierPDF: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    dureeEstimee: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
    },
  },
  {
    tableName: "courses",
  }
);

module.exports = Course;