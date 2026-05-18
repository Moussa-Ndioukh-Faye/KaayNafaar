const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { inscription, connexion, getProfil, mettreAJourProfil, changerMotDePasse, supprimerCompte, logout } = require("../controllers/authController");
const { proteger } = require("../middleware/auth");

// Middleware de validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Validation inscription
const validerInscription = [
  body("nom").trim().isLength({ min: 2, max: 100 }).withMessage("Le nom doit faire 2-100 caractères"),
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("motDePasse").isLength({ min: 6 }).withMessage("Le mot de passe doit faire au moins 6 caractères"),
];

// Validation connexion
const validerConnexion = [
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("motDePasse").notEmpty().withMessage("Mot de passe requis"),
];

// Validation changement mot de passe
const validerChangementMDP = [
  body("motDePasseActuel").notEmpty().withMessage("Mot de passe actuel requis"),
  body("nouveauMotDePasse").isLength({ min: 6 }).withMessage("Nouveau mot de passe doit faire au moins 6 caractères"),
];

router.post("/inscription", validerInscription, validate, inscription);
router.post("/connexion", validerConnexion, validate, connexion);
router.get("/profil", proteger, getProfil);
router.put("/profil", proteger, mettreAJourProfil);
router.put("/changer-mot-de-passe", validerChangementMDP, validate, proteger, changerMotDePasse);
router.delete("/compte", proteger, supprimerCompte);
router.post("/logout", logout);

module.exports = router;
