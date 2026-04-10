/**
 * Modèle Mongoose pour les Utilisateurs
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    motDePasse: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: 6,
      select: false, // Jamais renvoyé dans les requêtes par défaut
    },
    avatar: {
      type: String,
      default: null,
    },
    niveauEtude: {
      type: String,
      enum: ["lycée", "licence", "master", "doctorat", "autre"],
      default: "autre",
    },
    matieresFavorites: [String],
  },
  {
    timestamps: true, // createdAt, updatedAt automatiques
  }
);

// Hash du mot de passe avant sauvegarde
userSchema.pre("save", async function (next) {
  if (!this.isModified("motDePasse")) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 12);
  next();
});

// Méthode pour vérifier le mot de passe
userSchema.methods.verifierMotDePasse = async function (motDePasseSaisi) {
  return await bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

module.exports = mongoose.model("User", userSchema);
