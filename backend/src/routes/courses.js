const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  getCours, getCoursParId, creerCours, modifierCours, supprimerCours,
} = require("../controllers/courseController");
const { proteger } = require("../middleware/auth");

// Configuration de l'upload PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf" || ext === ".txt") return cb(null, true);
    cb(new Error("Seuls les fichiers PDF et TXT sont acceptés."));
  },
});

router.use(proteger); // Toutes les routes nécessitent une auth

router.get("/", getCours);
router.get("/:id", getCoursParId);
router.post("/", upload.single("fichier"), creerCours);
router.put("/:id", modifierCours);
router.delete("/:id", supprimerCours);

module.exports = router;
