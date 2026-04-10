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
    const utilisateurExistant = await User.findOne({ email: email.toLowerCase() });
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
    await Progression.create({ utilisateur: utilisateur._id });

    const token = genererToken(utilisateur._id);
    envoyerTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès !",
      token, // renvoyons encore le token pour compatibilité, mais le cookie est utilisé
      utilisateur: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        niveauEtude: utilisateur.niveauEtude,
      },
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    // Email déjà pris (contrainte unique MongoDB — race condition)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Cet email est déjà utilisé." });
    }
    // Erreur de validation Mongoose — extraire le premier message explicite
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors)[0]?.message || "Données invalides.";
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

    // Récupérer l'utilisateur avec le mot de passe (select: false par défaut)
    const utilisateur = await User.findOne({ email: email.toLowerCase().trim() }).select("+motDePasse");
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
    await Progression.findOneAndUpdate(
      { utilisateur: utilisateur._id },
      { "stats.dernierConnexion": new Date() }
    );

    const token = genererToken(utilisateur._id);
    envoyerTokenCookie(res, token);

    res.json({
      success: true,
      token,
      utilisateur: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        niveauEtude: utilisateur.niveauEtude,
        avatar: utilisateur.avatar,
      },
    });
  } catch (error) {
    console.error("Erreur connexion:", error);
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors)[0]?.message || "Données invalides.";
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: "Erreur lors de la connexion. Réessaie plus tard." });
  }
};

// GET /api/auth/profil
const getProfil = async (req, res) => {
  try {
    const utilisateur = await User.findById(req.utilisateur._id);
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

    // N'écraser que les champs explicitement envoyés
    const miseAJour = {};
    if (nom !== undefined) {
      if (nom.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Le nom doit contenir au moins 2 caractères." });
      }
      miseAJour.nom = nom.trim();
    }
    if (niveauEtude !== undefined) miseAJour.niveauEtude = niveauEtude;
    if (matieresFavorites !== undefined) miseAJour.matieresFavorites = matieresFavorites;

    const utilisateur = await User.findByIdAndUpdate(
      req.utilisateur._id,
      miseAJour,
      { new: true, runValidators: true }
    );
    res.json({ success: true, utilisateur });
  } catch (error) {
    console.error("Erreur mettreAJourProfil:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Cet email est déjà utilisé." });
    }
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors)[0]?.message || "Données invalides.";
      return res.status(400).json({ success: false, message: msg });
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

    const utilisateur = await User.findById(req.utilisateur._id).select("+motDePasse");
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

    const utilisateur = await User.findById(req.utilisateur._id).select("+motDePasse");
    const motDePasseValide = await utilisateur.verifierMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({ success: false, message: "Mot de passe incorrect." });
    }

    await User.findByIdAndDelete(req.utilisateur._id);
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
