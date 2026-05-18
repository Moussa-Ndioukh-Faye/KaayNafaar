const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Le nom est requis" },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: "Email invalide" },
      },
    },
    motDePasse: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { args: [6], msg: "Le mot de passe doit contenir au moins 6 caractères" },
      },
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    niveauEtude: {
      type: DataTypes.ENUM("lycée", "licence", "master", "doctorat", "autre"),
      defaultValue: "autre",
    },
    matieresFavorites: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    tableName: "users",
    hooks: {
      beforeCreate: async (user) => {
        if (user.motDePasse) {
          user.motDePasse = await bcrypt.hash(user.motDePasse, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("motDePasse")) {
          user.motDePasse = await bcrypt.hash(user.motDePasse, 12);
        }
      },
    },
  }
);

User.prototype.verifierMotDePasse = async function (motDePasseSaisi) {
  return await bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

module.exports = User;