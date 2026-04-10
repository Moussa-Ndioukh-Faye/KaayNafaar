const express = require("express");
const router = express.Router();
const { inscription, connexion, getProfil, mettreAJourProfil, changerMotDePasse, supprimerCompte, logout } = require("../controllers/authController");
const { proteger } = require("../middleware/auth");

router.post("/inscription", inscription);
router.post("/connexion", connexion);
router.get("/profil", proteger, getProfil);
router.put("/profil", proteger, mettreAJourProfil);
router.put("/changer-mot-de-passe", proteger, changerMotDePasse);
router.delete("/compte", proteger, supprimerCompte);
router.post("/logout", logout);

module.exports = router;
