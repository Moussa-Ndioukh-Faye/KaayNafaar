const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/dbMysql");

const Progression = sequelize.define(
  "Progression",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    stats: {
      type: DataTypes.JSON,
      defaultValue: {
        coursTotal: 0,
        fichesTotal: 0,
        quizTotal: 0,
        scoreMoyenQuiz: 0,
        tempsRevisionTotal: 0,
        serie: 0,
        dernierConnexion: new Date(),
      },
    },
    planning: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    matieres: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    activiteJournaliere: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    tableName: "progressions",
  }
);

module.exports = Progression;