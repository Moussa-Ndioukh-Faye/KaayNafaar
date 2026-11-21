const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { inscription, connexion, getProfil, mettreAJourProfil, changerMotDePasse, supprimerCompte, exporterDonnees, logout } = require("../controllers/authController");
const { proteger } = require("../middleware/auth");

// Middleware de validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Politique de mot de passe (NIST SP 800-63B / OWASP ASVS V2.1) :
// 8 caractères minimum, 72 octets maximum (limite de bcrypt), pas de règles de composition imposées.
const regleMotDePasse = (champ) =>
  body(champ)
    .isString()
    .isLength({ min: 8 })
    .withMessage("Le mot de passe doit faire au moins 8 caractères")
    .custom((v) => Buffer.byteLength(v, "utf8") <= 72)
    .withMessage("Le mot de passe est trop long (72 octets maximum)");

// Validation inscription
const validerInscription = [
  body("nom").trim().isLength({ min: 2, max: 100 }).withMessage("Le nom doit faire 2-100 caractères"),
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  regleMotDePasse("motDePasse"),
  body("niveauEtude").optional().isIn(["lycée", "licence", "master", "doctorat", "autre"]),
];

// Validation connexion
const validerConnexion = [
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("motDePasse").notEmpty().withMessage("Mot de passe requis"),
];

// Validation changement mot de passe
const validerChangementMDP = [
  body("motDePasseActuel").notEmpty().withMessage("Mot de passe actuel requis"),
  regleMotDePasse("nouveauMotDePasse"),
];

// Validation mise à jour du profil
const validerProfil = [
  body("nom").optional().trim().isLength({ min: 2, max: 100 }).withMessage("Le nom doit faire 2-100 caractères"),
  body("email").optional().isEmail().normalizeEmail().withMessage("Email invalide"),
];

// Validation suppression de compte
const validerSuppression = [body("motDePasse").notEmpty().withMessage("Mot de passe requis")];

router.post("/inscription", validerInscription, validate, inscription);
router.post("/connexion", validerConnexion, validate, connexion);
router.get("/profil", proteger, getProfil);
router.put("/profil", proteger, validerProfil, validate, mettreAJourProfil);
router.put("/changer-mot-de-passe", proteger, validerChangementMDP, validate, changerMotDePasse);
router.delete("/compte", proteger, validerSuppression, validate, supprimerCompte);
router.get("/export", proteger, exporterDonnees);
router.post("/logout", logout);

module.exports = router;
