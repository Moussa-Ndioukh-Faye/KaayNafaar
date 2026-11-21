const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { body, param } = require("express-validator");
const {
  getCours, getCoursParId, creerCours, modifierCours, supprimerCours,
} = require("../controllers/courseController");
const { proteger } = require("../middleware/auth");

// Configuration de l'upload PDF
const uploadDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Types acceptés : extension ET type MIME doivent correspondre (OWASP File Upload)
const TYPES_AUTORISES = {
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  // Nom aléatoire : jamais le nom fourni par le client (traversée de chemin, devinette)
  filename: (req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }, // 50 Mo, un seul fichier
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimes = TYPES_AUTORISES[ext];
    if (mimes && mimes.includes(file.mimetype)) return cb(null, true);
    const err = new Error("Fichiers acceptés : PDF, TXT, JPG, PNG.");
    err.code = "TYPE_FICHIER_INVALIDE";
    cb(err);
  },
});

// Validation
const validerCours = [
  body("titre").trim().isLength({ min: 1, max: 200 }).withMessage("Titre invalide (1-200 caractères)"),
  body("matiere").trim().isLength({ min: 1, max: 100 }).withMessage("Matière invalide (1-100 caractères)"),
];

const validate = (req, res, next) => {
  const errors = require("express-validator").validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.use(proteger);

router.get("/", getCours);
router.get("/:id", getCoursParId);
router.post("/", upload.single("fichier"), validerCours, validate, creerCours);
router.put("/:id", param("id").isInt({ min: 1 }), validerCours, validate, modifierCours);
router.delete("/:id", param("id").isInt({ min: 1 }), validate, supprimerCours);

module.exports = router;
