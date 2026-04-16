/**
 * Contrôleur d'authentification
 * Inscription, connexion, profil
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Progression = require("../models/Progression");

// Générer un JWT
const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Helper pour envoyer le token en cookie httpOnly
const envoyerTokenCookie = (res, token) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
  };
  res.cookie("token", token, options);
};


// POST /api/auth/inscription
const inscription = async (req, res) => {
  try {
    const { nom, email, motDePasse, niveauEtude } = req.body;

    // Validation serveur
    if (!nom || nom.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Le nom doit contenir au moins 2 caractères." });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Adresse email invalide." });
    }
    if (!motDePasse || motDePasse.length < 6) {
      return res.status(400).json({ success: false, message: "Le mot de passe doit contenir au moins 6 caractères." });
    }

    // Vérifier si l'email existe déjà
    const utilisateurExistant = await User.findOne({ where: { email: email.toLowerCase() } });
    if (utilisateurExistant) {
      return res
        .status(400)
        .json({ success: false, message: "Cet email est déjà utilisé." });
    }

    // Créer l'utilisateur
    const utilisateur = await User.create({
      nom: nom.trim(),
      email: email.toLowerCase(),
      motDePasse,
      niveauEtude: niveauEtude || "autre",
    });

    // Créer un profil de progression initial
    await Progression.create({ utilisateurId: utilisateur.id });

    const token = genererToken(utilisateur.id);
    envoyerTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès !",
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        niveauEtude: utilisateur.niveauEtude,
      },
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    // Email déjà pris (contrainte unique MySQL)
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ success: false, message: "Cet email est déjà utilisé." });
    }
    // Erreur de validation Sequelize
    if (error.name === "SequelizeValidationError") {
      const msg = error.errors[0]?.message || "Données invalides.";
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: "Erreur lors de la création du compte. Réessaie plus tard." });
  }
};

// POST /api/auth/connexion
const connexion = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis.",
      });
    }

    // Récupérer l'utilisateur avec le mot de passe
    const utilisateur = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!utilisateur) {
      return res
        .status(401)
        .json({ success: false, message: "Email ou mot de passe incorrect." });
    }

    const motDePasseValide = await utilisateur.verifierMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res
        .status(401)
        .json({ success: false, message: "Email ou mot de passe incorrect." });
    }

    // Mettre à jour la dernière connexion
    await Progression.update(
      { stats: { dernierConnexion: new Date() } },
      { where: { utilisateurId: utilisateur.id } }
    );

    const token = genererToken(utilisateur.id);
    envoyerTokenCookie(res, token);

    res.json({
      success: true,
      message: "Connexion réussie",
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        niveauEtude: utilisateur.niveauEtude,
        avatar: utilisateur.avatar,
      },
    });
  } catch (error) {
    console.error("Erreur connexion:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la connexion. Réessaie plus tard." });
  }
};

// GET /api/auth/profil
const getProfil = async (req, res) => {
  try {
    const utilisateur = await User.findByPk(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }
    res.json({ success: true, utilisateur });
  } catch (error) {
    console.error("Erreur getProfil:", error);
    res.status(500).json({ success: false, message: "Impossible de récupérer le profil." });
  }
};

// PUT /api/auth/profil
const mettreAJourProfil = async (req, res) => {
  try {
    const { nom, niveauEtude, matieresFavorites } = req.body;

    const utilisateur = await User.findByPk(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }

    if (nom !== undefined) {
      if (nom.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Le nom doit contenir au moins 2 caractères." });
      }
      utilisateur.nom = nom.trim();
    }
    if (niveauEtude !== undefined) utilisateur.niveauEtude = niveauEtude;
    if (matieresFavorites !== undefined) utilisateur.matieresFavorites = matieresFavorites;

    await utilisateur.save();
    res.json({ success: true, utilisateur });
  } catch (error) {
    console.error("Erreur mettreAJourProfil:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ success: false, message: "Cet email est déjà utilisé." });
    }
    res.status(500).json({ success: false, message: "Impossible de mettre à jour le profil." });
  }
};

// POST /api/auth/changer-mot-de-passe
const changerMotDePasse = async (req, res) => {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body;

    if (!motDePasseActuel || !nouveauMotDePasse) {
      return res.status(400).json({ success: false, message: "Les deux mots de passe sont requis." });
    }
    if (nouveauMotDePasse.length < 8) {
      return res.status(400).json({ success: false, message: "Le nouveau mot de passe doit contenir au moins 8 caractères." });
    }

    const utilisateur = await User.findByPk(req.utilisateur.id);
    const motDePasseValide = await utilisateur.verifierMotDePasse(motDePasseActuel);
    if (!motDePasseValide) {
      return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect." });
    }

    utilisateur.motDePasse = nouveauMotDePasse;
    await utilisateur.save();

    res.json({ success: true, message: "Mot de passe changé avec succès." });
  } catch (error) {
    console.error("Erreur changerMotDePasse:", error);
    res.status(500).json({ success: false, message: "Erreur lors du changement de mot de passe." });
  }
};

// DELETE /api/auth/supprimer-compte
const supprimerCompte = async (req, res) => {
  try {
    const { motDePasse } = req.body;

    const utilisateur = await User.findByPk(req.utilisateur.id);
    const motDePasseValide = await utilisateur.verifierMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ success: false, message: "Mot de passe incorrect." });
    }

    const userId = utilisateur.id;

    await Promise.all([
      User.destroy({ where: { id: userId } }),
      require("../models/Progression").destroy({ where: { utilisateurId: userId } }),
      require("../models/Course").destroy({ where: { utilisateurId: userId } }),
      require("../models/Fiche").destroy({ where: { utilisateurId: userId } }),
      require("../models/Quiz").destroy({ where: { utilisateurId: userId } }),
    ]);

    res.clearCookie("token");
    res.json({ success: true, message: "Compte supprimé." });
  } catch (error) {
    console.error("Erreur supprimerCompte:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la suppression du compte." });
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Déconnecté avec succès." });
};

module.exports = { inscription, connexion, getProfil, mettreAJourProfil, changerMotDePasse, supprimerCompte, logout };
