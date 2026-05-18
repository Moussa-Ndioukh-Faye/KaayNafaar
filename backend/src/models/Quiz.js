const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Quiz = sequelize.define(
  "Quiz",
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
    questions: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    matiere: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    difficulte: {
      type: DataTypes.ENUM("facile", "moyen", "difficile"),
      defaultValue: "moyen",
    },
    dureeMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    sessions: {
      type: DataTypes.JSONB,
      defaultValue: [],
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
    tableName: "quizzes",
  }
);

module.exports = Quiz;