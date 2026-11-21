/**
 * Contrôleur d'authentification
 * Inscription, connexion, profil
 */

const User = require("../models/User");
const Progression = require("../models/Progression");
const Course = require("../models/Course");
const Fiche = require("../models/Fiche");
const Quiz = require("../models/Quiz");
const FeedbackIA = require("../models/FeedbackIA");
const { Op } = require("sequelize");
const db = require("../config/database"); // getter : suit le basculement SQLite
const { supprimerFichier } = require("../utils/fichiers");

const bcrypt = require("bcryptjs");
const { genererToken } = require("../utils/jeton");

// Hash bcrypt d'une valeur aléatoire, utilisé contre l'énumération par chronométrage
const HASH_FACTICE = bcrypt.hashSync(require("crypto").randomBytes(16).toString("hex"), 12);

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

    const token = genererToken(utilisateur);
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
      // Comparaison factice : même temps de réponse que le compte existe ou non
      await bcrypt.compare(motDePasse, HASH_FACTICE);
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

    const token = genererToken(utilisateur);
    envoyerTokenCookie(res, token, req);

    res.json({
      success: true,
      message: "Connexion réussie",
      token,
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

    // Les autres sessions sont révoquées (empreinte du mot de passe dans le JWT) :
    // on émet un nouveau jeton pour garder la session courante active.
    const token = genererToken(utilisateur);
    envoyerTokenCookie(res, token, req);

    res.json({ success: true, message: "Mot de passe modifié avec succès.", token });
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

    // Droit à l'effacement (RGPD art. 17 / loi sénégalaise 2008-12) :
    // suppression de TOUTES les données, enfants d'abord pour respecter les clés étrangères.
    const uid = utilisateur.id;
    const cours = await Course.findAll({ where: { utilisateurId: uid }, attributes: ["fichierPDF"] });

    await FeedbackIA.destroy({ where: { utilisateurId: uid } });
    await Quiz.destroy({ where: { utilisateurId: uid } });
    await Fiche.destroy({ where: { utilisateurId: uid } });
    await Course.destroy({ where: { utilisateurId: uid } });
    await Progression.destroy({ where: { utilisateurId: uid } });

    // Vecteurs d'indexation IA (table pgvector, absente en mode SQLite/test)
    if (db.sequelize.getDialect() === "postgres") {
      await db.sequelize
        .query("DELETE FROM course_embeddings WHERE metadata->>'utilisateurId' = :uid", {
          replacements: { uid: String(uid) },
        })
        .catch((err) => console.error("Suppression embeddings:", err.message));
    }

    await utilisateur.destroy();

    // Fichiers importés sur le disque
    await Promise.all(cours.map((c) => supprimerFichier(c.fichierPDF)));

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

// GET /api/auth/export — Droit à la portabilité (RGPD art. 20)
const exporterDonnees = async (req, res) => {
  try {
    const uid = req.utilisateur.id;
    const [utilisateur, cours, fiches, quiz, progression, feedbacks] = await Promise.all([
      User.findByPk(uid, { attributes: { exclude: ["motDePasse"] } }),
      Course.findAll({ where: { utilisateurId: uid }, attributes: { exclude: ["fichierPDF"] } }),
      Fiche.findAll({ where: { utilisateurId: uid } }),
      Quiz.findAll({ where: { utilisateurId: uid } }),
      Progression.findOne({ where: { utilisateurId: uid } }),
      FeedbackIA.findAll({ where: { utilisateurId: uid } }),
    ]);

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="kaay-nafaar-mes-donnees-${date}.json"`);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      format: "kaay-nafaar-export-v1",
      exporteLe: new Date().toISOString(),
      utilisateur,
      cours,
      fiches,
      quiz,
      progression,
      feedbacksIA: feedbacks,
    });
  } catch (error) {
    console.error("Erreur exporterDonnees:", error);
    res.status(500).json({ success: false, message: "Erreur lors de l'export des données." });
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

module.exports = { inscription, connexion, getProfil, mettreAJourProfil, changerMotDePasse, supprimerCompte, exporterDonnees, logout };
