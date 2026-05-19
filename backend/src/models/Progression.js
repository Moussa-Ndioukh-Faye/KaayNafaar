const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

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
      type: DataTypes.JSONB,
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
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    matieres: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    activiteJournaliere: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    analyseIA: {
      type: DataTypes.JSONB,
      defaultValue: {
        scoreGlobal: 0,
        evolution: [],
        recommandations: [],
      },
    },
  },
  {
    tableName: "progressions",
  }
);

module.exports = Progression;