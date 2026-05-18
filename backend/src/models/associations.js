const { sequelize } = require("../config/database");
const User = require("../models/User");
const Course = require("../models/Course");
const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const Progression = require("../models/Progression");

User.hasMany(Course, { foreignKey: "utilisateurId", as: "courses" });
Course.belongsTo(User, { foreignKey: "utilisateurId", as: "utilisateur" });

User.hasMany(Fiche, { foreignKey: "utilisateurId", as: "fiches" });
Fiche.belongsTo(User, { foreignKey: "utilisateurId", as: "utilisateur" });
Course.hasMany(Fiche, { foreignKey: "coursId", as: "fiches" });
Fiche.belongsTo(Course, { foreignKey: "coursId", as: "cours" });

User.hasMany(Quiz, { foreignKey: "utilisateurId", as: "quizzes" });
Quiz.belongsTo(User, { foreignKey: "utilisateurId", as: "utilisateur" });
Course.hasMany(Quiz, { foreignKey: "coursId", as: "quizzes" });
Quiz.belongsTo(Course, { foreignKey: "coursId", as: "cours" });

User.hasOne(Progression, { foreignKey: "utilisateurId", as: "progression" });
Progression.belongsTo(User, { foreignKey: "utilisateurId", as: "utilisateur" });

module.exports = { sequelize, User, Course, Fiche, Quiz, Progression };