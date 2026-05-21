/**
 * Contrôleur d'authentification
 * Inscription, connexion, profil
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Progression = require("../models/Progression");
const Course = require("../models/Course");
const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const { Op } = require("sequelize");

// Générer un JWT
const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Helper pour envoyer le token en cookie httpOnly
const envoyerTokenCookie = (res, token, req) => {
  const isLocalhost = req.get("host")?.includes("localhost");
  const isProd = process.env.NODE_ENV === "production";
  
  const options = {
    httpOnly: true,
    // Pour que les cookies cross-site (Vercel -> sslip.io) fonctionnent, 
    // il faut SameSite=None et Secure=true
    secure: isProd && !isLocalhost,
    sameSite: isProd && !isLocalhost ? "none" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
  };
  res.cookie("token", token, options);
};

// POST /api/auth/inscription
const inscription = async (req, res) => {
  try {
    const { nom, email, motDePasse, niveauEtude } = req.body;

    if (!nom || !email || !motDePasse) {
      return res.status(400).json({
        success: false,
        message: "Nom, email et mot de passe sont requis.",
      });
    }

    const emailNettoye = email.toLowerCase().trim();

    const existe = await User.findOne({ where: { email: emailNettoye } });
    if (existe) {
      return res.status(409).json({
        success: false,
        message: "Un compte avec cet email existe déjà.",
      });
    }

    const utilisateur = await User.create({
      nom: nom.trim(),
      email: emailNettoye,
      motDePasse,
      niveauEtude: niveauEtude || "licence",
    });

    await Progression.create({
      utilisateurId: utilisateur.id,
    });

    const token = genererToken(utilisateur.id);
    envoyerTokenCookie(res, token, req);

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès",
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        niveauEtude: utilisateur.niveauEtude,
      },
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'inscription." });
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

    const emailNettoye = email.toLowerCase().trim();

    // Récupérer l'utilisateur avec le mot de passe
    const utilisateur = await User.findOne({ where: { email: emailNettoye } });
    
    // Message générique pour éviter le user enumeration
    const erreurAuth = { success: false, message: "Email ou mot de passe incorrect." };

    if (!utilisateur) {
      return res.status(401).json(erreurAuth);
    }

    const motDePasseValide = await utilisateur.verifierMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json(erreurAuth);
    }

    // Mettre à jour la dernière connexion (optionnel, sans bloquer)
    Progression.update(
      { stats: { dernierConnexion: new Date() } },
      { where: { utilisateurId: utilisateur.id } }
    ).catch(err => console.error("Erreur update last login:", err));

    const token = genererToken(utilisateur.id);
    envoyerTokenCookie(res, token, req);

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
    res.status(500).json({ success: false, message: "Erreur serveur lors de la connexion." });
  }
};

// GET /api/auth/profil
const getProfil = async (req, res) => {
  try {
    const utilisateur = await User.findByPk(req.utilisateur.id, {
      attributes: { exclude: ["motDePasse"] },
    });

    if (!utilisateur) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    res.json({ success: true, utilisateur, token: req.tokenJWT });
  } catch (error) {
    console.error("Erreur getProfil:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération du profil." });
  }
};

// PUT /api/auth/profil
const mettreAJourProfil = async (req, res) => {
  try {
    const { nom, email } = req.body;

    if (email) {
      const emailNettoye = email.toLowerCase().trim();
      const existe = await User.findOne({
        where: {
          email: emailNettoye,
          id: { [Op.ne]: req.utilisateur.id },
        },
      });
      if (existe) {
        return res.status(409).json({ success: false, message: "Cet email est déjà utilisé." });
      }
    }

    const champs = {};
    if (nom) champs.nom = nom.trim();
    if (email) champs.email = email.toLowerCase().trim();

    await req.utilisateur.update(champs);

    const utilisateur = await User.findByPk(req.utilisateur.id, {
      attributes: { exclude: ["motDePasse"] },
    });

    res.json({ success: true, utilisateur });
  } catch (error) {
    console.error("Erreur mettreAJourProfil:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la mise à jour du profil." });
  }
};

// PUT /api/auth/changer-mot-de-passe
const changerMotDePasse = async (req, res) => {
  try {
    const { motDePasseActuel, nouveauMotDePasse } = req.body;

    const utilisateur = await User.findByPk(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    const valide = await utilisateur.verifierMotDePasse(motDePasseActuel);
    if (!valide) {
      return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect." });
    }

    utilisateur.motDePasse = nouveauMotDePasse;
    await utilisateur.save();

    res.json({ success: true, message: "Mot de passe modifié avec succès." });
  } catch (error) {
    console.error("Erreur changerMotDePasse:", error);
    res.status(500).json({ success: false, message: "Erreur lors du changement de mot de passe." });
  }
};

// DELETE /api/auth/compte
const supprimerCompte = async (req, res) => {
  try {
    const { motDePasse } = req.body;

    if (!motDePasse) {
      return res.status(400).json({ success: false, message: "Mot de passe requis pour supprimer le compte." });
    }

    const utilisateur = await User.findByPk(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    const valide = await utilisateur.verifierMotDePasse(motDePasse);
    if (!valide) {
      return res.status(401).json({ success: false, message: "Mot de passe incorrect." });
    }

    await Promise.all([
      Course.destroy({ where: { utilisateurId: utilisateur.id } }),
      Fiche.destroy({ where: { utilisateurId: utilisateur.id } }),
      Quiz.destroy({ where: { utilisateurId: utilisateur.id } }),
      Progression.destroy({ where: { utilisateurId: utilisateur.id } }),
      utilisateur.destroy(),
    ]);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res.json({ success: true, message: "Compte supprimé définitivement." });
  } catch (error) {
    console.error("Erreur supprimerCompte:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la suppression du compte." });
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  res.json({ success: true, message: "Déconnecté avec succès." });
};

module.exports = { inscription, connexion, getProfil, mettreAJourProfil, changerMotDePasse, supprimerCompte, logout };
