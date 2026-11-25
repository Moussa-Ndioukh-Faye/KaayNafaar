const { sequelize } = require("../config/database");
const User = require("../models/User");
const Course = require("../models/Course");
const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const Progression = require("../models/Progression");
const Carnet = require("../models/Carnet");
const Session = require("../models/Session");
const CarnetMessage = require("../models/CarnetMessage");
const CarnetProduction = require("../models/CarnetProduction");

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

User.hasMany(Carnet, { foreignKey: "utilisateurId", as: "carnets", onDelete: "CASCADE" });
Carnet.belongsTo(User, { foreignKey: "utilisateurId", as: "utilisateur" });

Carnet.hasMany(CarnetMessage, { foreignKey: "carnetId", as: "messages", onDelete: "CASCADE" });
CarnetMessage.belongsTo(Carnet, { foreignKey: "carnetId", as: "carnet" });
Carnet.hasMany(CarnetProduction, { foreignKey: "carnetId", as: "productions", onDelete: "CASCADE" });
CarnetProduction.belongsTo(Carnet, { foreignKey: "carnetId", as: "carnet" });

User.hasMany(Session, { foreignKey: "utilisateurId", as: "sessions", onDelete: "CASCADE" });
Session.belongsTo(User, { foreignKey: "utilisateurId", as: "utilisateur" });

module.exports = { sequelize, User, Course, Fiche, Quiz, Progression, Carnet, Session, CarnetMessage, CarnetProduction };