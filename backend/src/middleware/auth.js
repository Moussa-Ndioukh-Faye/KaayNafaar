/**
 * Middleware d'authentification JWT
 */

const User = require("../models/User");
const { verifierToken, empreinteMotDePasse } = require("../utils/jeton");

const proteger = async (req, res, next) => {
  let token;

  // 1. Vérifier le header Authorization (prioritaire pour les API mobiles/externes)
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2. Si pas de header, utiliser le cookie httpOnly (standard web sécurisé)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Accès non autorisé. Veuillez vous connecter.",
    });
  }

  // Passer le token brut pour les endpoints qui en ont besoin (restauration session frontend)
  req.tokenJWT = token;

  try {
    // Vérifier le token (algorithme imposé)
    const decoded = verifierToken(token);

    // Récupérer l'utilisateur
    const utilisateur = await User.findByPk(decoded.id);

    if (!utilisateur) {
      return res.status(401).json({
        success: false,
        message: "Session invalide. Utilisateur non trouvé.",
      });
    }

    // Session révoquée si le mot de passe a changé depuis l'émission du jeton
    const empreinte = empreinteMotDePasse(utilisateur.motDePasse);
    if (empreinte && decoded.pwv !== empreinte) {
      return res.status(401).json({
        success: false,
        message: "Session expirée. Veuillez vous reconnecter.",
      });
    }

    // Ne jamais garder le hash du mot de passe dans l'objet de requête
    if (utilisateur.dataValues) delete utilisateur.dataValues.motDePasse;
    else delete utilisateur.motDePasse;

    req.utilisateur = utilisateur;
    next();
  } catch (error) {
    console.error("Erreur Auth Middleware:", error.name);
    
    let msg = "Session expirée ou invalide.";
    if (error.name === "TokenExpiredError") msg = "Votre session a expiré. Veuillez vous reconnecter.";

    return res.status(401).json({
      success: false,
      message: msg,
    });
  }
};

module.exports = { proteger };
