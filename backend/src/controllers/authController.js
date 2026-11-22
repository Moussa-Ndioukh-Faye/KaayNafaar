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
const { genererToken, genererJetonUpload } = require("../utils/jeton");
const {
  verificationEmailActive,
  envoyerVerification,
  envoyerReinitialisation,
  notifierMotDePasseModifie,
  hacherJeton,
  DUREE_REINITIALISATION_MS,
} = require("../utils/email");
const { journaliser, signalerEchecConnexion, masquerEmail } = require("../utils/journalSecurite");

// Champs jamais renvoyés au client
const CHAMPS_PRIVES = [
  "motDePasse",
  "jetonVerification",
  "jetonVerificationExpire",
  "jetonReinitialisation",
  "jetonReinitialisationExpire",
];

const profilPublic = (u) => ({
  id: u.id,
  nom: u.nom,
  email: u.email,
  niveauEtude: u.niveauEtude,
  avatar: u.avatar,
  emailVerifie: u.emailVerifie,
});

// Hash bcrypt d'une valeur aléatoire, utilisé contre l'énumération par chronométrage
const HASH_FACTICE = bcrypt.hashSync(require("crypto").randomBytes(16).toString("hex"), 12);

// Cookie de session : httpOnly (inaccessible au JavaScript), Secure en production,
// SameSite=Lax (toutes les requêtes passent par le proxy Vercel : même site).
const optionsCookie = (req) => {
  const isLocalhost = req?.get?.("host")?.includes("localhost");
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !isLocalhost,
    sameSite: "lax",
    path: "/",
  };
};

const envoyerTokenCookie = (res, token, req) => {
  res.cookie("token", token, { ...optionsCookie(req), maxAge: 1000 * 60 * 60 * 24 * 7 }); // 7 jours
};

const effacerCookie = (res, req) => res.clearCookie("token", optionsCookie(req));

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

    const verificationRequise = verificationEmailActive();

    const utilisateur = await User.create({
      nom: nom.trim(),
      email: emailNettoye,
      motDePasse,
      niveauEtude: niveauEtude || "licence",
      // Sans fournisseur d'email configuré, le compte est actif immédiatement
      emailVerifie: !verificationRequise,
    });

    await Progression.create({
      utilisateurId: utilisateur.id,
    });

    if (verificationRequise) {
      let emailEnvoye = true;
      try {
        await envoyerVerification(utilisateur);
      } catch (err) {
        emailEnvoye = false;
        console.error("Erreur envoi email de vérification:", err.message);
      }
      // Pas de session tant que l'adresse n'est pas confirmée
      return res.status(201).json({
        success: true,
        verificationRequise: true,
        email: utilisateur.email,
        message: emailEnvoye
          ? "Compte créé. Un email de confirmation vient de t'être envoyé."
          : "Compte créé, mais l'email de confirmation n'a pas pu partir. Demande un nouvel envoi.",
      });
    }

    const token = genererToken(utilisateur);
    envoyerTokenCookie(res, token, req);

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès",
      utilisateur: profilPublic(utilisateur),
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
      signalerEchecConnexion(req, emailNettoye, "compte_inconnu");
      return res.status(401).json(erreurAuth);
    }

    const motDePasseValide = await utilisateur.verifierMotDePasse(motDePasse);
    if (!motDePasseValide) {
      signalerEchecConnexion(req, emailNettoye, "mot_de_passe");
      return res.status(401).json(erreurAuth);
    }

    // Adresse email non confirmée : pas de session
    if (verificationEmailActive() && !utilisateur.emailVerifie) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NON_VERIFIE",
        email: utilisateur.email,
        message: "Confirme d'abord ton adresse email : clique sur le lien reçu par email.",
      });
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
      utilisateur: profilPublic(utilisateur),
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
      attributes: { exclude: CHAMPS_PRIVES },
    });

    if (!utilisateur) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    res.json({ success: true, utilisateur });
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
    const nouvelEmail = email && email.toLowerCase().trim() !== req.utilisateur.email;
    if (nouvelEmail) {
      champs.email = email.toLowerCase().trim();
      // Nouvelle adresse : à confirmer (la session en cours reste active)
      if (verificationEmailActive()) champs.emailVerifie = false;
    }

    await req.utilisateur.update(champs);

    if (nouvelEmail && verificationEmailActive()) {
      envoyerVerification(req.utilisateur).catch((err) =>
        console.error("Erreur envoi email de vérification:", err.message)
      );
    }

    const utilisateur = await User.findByPk(req.utilisateur.id, {
      attributes: { exclude: CHAMPS_PRIVES },
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
      signalerEchecConnexion(req, utilisateur.email, "changement_mot_de_passe");
      return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect." });
    }

    utilisateur.motDePasse = nouveauMotDePasse;
    await utilisateur.save();
    journaliser("mot_de_passe.modifie", req, { utilisateurId: utilisateur.id });
    notifierMotDePasseModifie(utilisateur).catch((err) =>
      console.error("Notification changement de mot de passe:", err.message)
    );

    // Les autres sessions sont révoquées (empreinte du mot de passe dans le JWT) :
    // on émet un nouveau jeton pour garder la session courante active.
    const token = genererToken(utilisateur);
    envoyerTokenCookie(res, token, req);

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

    effacerCookie(res, req);

    res.json({ success: true, message: "Compte supprimé définitivement." });
  } catch (error) {
    console.error("Erreur supprimerCompte:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la suppression du compte." });
  }
};

// POST /api/auth/verifier-email — confirme l'adresse avec le jeton reçu par email
const verifierEmail = async (req, res) => {
  try {
    const utilisateur = await User.findOne({
      where: {
        jetonVerification: hacherJeton(req.body.token),
        jetonVerificationExpire: { [Op.gt]: new Date() },
      },
    });

    if (!utilisateur) {
      return res.status(400).json({
        success: false,
        code: "JETON_INVALIDE",
        message: "Ce lien est invalide ou a expiré. Demande un nouvel email de confirmation.",
      });
    }

    await utilisateur.update({ emailVerifie: true, jetonVerification: null, jetonVerificationExpire: null });

    // Connexion directe après confirmation
    const token = genererToken(utilisateur);
    envoyerTokenCookie(res, token, req);
    res.json({ success: true, message: "Adresse email confirmée. Bienvenue !", utilisateur: profilPublic(utilisateur) });
  } catch (error) {
    console.error("Erreur verifierEmail:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la vérification." });
  }
};

// POST /api/auth/renvoyer-verification — réponse identique que le compte existe ou non
const renvoyerVerification = async (req, res) => {
  const reponse = {
    success: true,
    message: "Si un compte non confirmé existe pour cette adresse, un nouvel email vient d'être envoyé.",
  };
  try {
    if (!verificationEmailActive()) return res.json(reponse);

    const utilisateur = await User.findOne({ where: { email: String(req.body.email).toLowerCase().trim() } });
    if (utilisateur && !utilisateur.emailVerifie) {
      // Anti-abus : un envoi par minute au plus
      const emisLe = utilisateur.jetonVerificationExpire
        ? new Date(utilisateur.jetonVerificationExpire).getTime() - 24 * 60 * 60 * 1000
        : 0;
      if (Date.now() - emisLe > 60 * 1000) {
        await envoyerVerification(utilisateur).catch((err) =>
          console.error("Erreur envoi email de vérification:", err.message)
        );
      }
    }
    res.json(reponse);
  } catch (error) {
    console.error("Erreur renvoyerVerification:", error);
    res.json(reponse);
  }
};

// POST /api/auth/mot-de-passe-oublie — réponse identique que le compte existe ou non
// (OWASP Forgot Password Cheat Sheet : pas d'énumération des comptes)
const motDePasseOublie = async (req, res) => {
  const reponse = {
    success: true,
    message:
      "Si un compte existe pour cette adresse, un email avec un lien de réinitialisation vient d'être envoyé. Le lien est valable 15 minutes.",
  };
  try {
    const email = String(req.body.email).toLowerCase().trim();
    journaliser("mot_de_passe.demande_reinitialisation", req, { email: masquerEmail(email) });

    const utilisateur = await User.findOne({ where: { email } });
    if (utilisateur) {
      // Anti-abus : un envoi par minute au plus
      const emisLe = utilisateur.jetonReinitialisationExpire
        ? new Date(utilisateur.jetonReinitialisationExpire).getTime() - DUREE_REINITIALISATION_MS
        : 0;
      if (Date.now() - emisLe > 60 * 1000) {
        await envoyerReinitialisation(utilisateur).catch((err) =>
          console.error("Erreur envoi email de réinitialisation:", err.message)
        );
      }
    }
    res.json(reponse);
  } catch (error) {
    console.error("Erreur motDePasseOublie:", error);
    res.json(reponse);
  }
};

// POST /api/auth/reinitialiser-mot-de-passe — jeton à usage unique, 15 minutes
const reinitialiserMotDePasse = async (req, res) => {
  try {
    const { token, nouveauMotDePasse } = req.body;
    const utilisateur = await User.findOne({
      where: {
        jetonReinitialisation: hacherJeton(token),
        jetonReinitialisationExpire: { [Op.gt]: new Date() },
      },
    });

    if (!utilisateur) {
      journaliser("mot_de_passe.jeton_invalide", req, {}, "warn");
      return res.status(400).json({
        success: false,
        code: "JETON_INVALIDE",
        message: "Ce lien est invalide ou a expiré. Refais une demande de réinitialisation.",
      });
    }

    utilisateur.motDePasse = nouveauMotDePasse;
    utilisateur.jetonReinitialisation = null;
    utilisateur.jetonReinitialisationExpire = null;
    // Le lien a été reçu dans la boîte mail : l'adresse est donc confirmée
    utilisateur.emailVerifie = true;
    utilisateur.jetonVerification = null;
    utilisateur.jetonVerificationExpire = null;
    await utilisateur.save(); // nouveau hash → toutes les sessions existantes sont révoquées

    journaliser("mot_de_passe.reinitialise", req, { utilisateurId: utilisateur.id });
    notifierMotDePasseModifie(utilisateur).catch((err) =>
      console.error("Notification réinitialisation:", err.message)
    );

    // Pas de connexion automatique (OWASP) : l'utilisateur se reconnecte normalement
    res.json({ success: true, message: "Mot de passe modifié. Tu peux maintenant te connecter." });
  } catch (error) {
    console.error("Erreur reinitialiserMotDePasse:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la réinitialisation." });
  }
};

// GET /api/auth/export — Droit à la portabilité (RGPD art. 20)
const exporterDonnees = async (req, res) => {
  try {
    const uid = req.utilisateur.id;
    const [utilisateur, cours, fiches, quiz, progression, feedbacks] = await Promise.all([
      User.findByPk(uid, { attributes: { exclude: CHAMPS_PRIVES } }),
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

// GET /api/auth/jeton-upload — jeton de 5 minutes, valable uniquement pour importer un cours
const jetonUpload = (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ success: true, jeton: genererJetonUpload(req.utilisateur) });
};

// POST /api/auth/logout
const logout = (req, res) => {
  effacerCookie(res, req);
  res.json({ success: true, message: "Déconnecté avec succès." });
};

module.exports = {
  inscription,
  connexion,
  getProfil,
  mettreAJourProfil,
  changerMotDePasse,
  supprimerCompte,
  exporterDonnees,
  verifierEmail,
  renvoyerVerification,
  motDePasseOublie,
  reinitialiserMotDePasse,
  jetonUpload,
  logout,
};
