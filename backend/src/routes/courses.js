const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { body } = require("express-validator");
const {
  getCours, getCoursParId, creerCours, modifierCours, supprimerCours,
} = require("../controllers/courseController");
const { proteger } = require("../middleware/auth");

// Configuration de l'upload PDF
const uploadDir = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, "_")}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = [".pdf", ".txt", ".jpg", ".jpeg", ".png"];
    if (allowedExts.includes(ext)) return cb(null, true);
    cb(new Error("Fichiers acceptés : PDF, TXT, JPG, PNG."));
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
router.put("/:id", validerCours, validate, modifierCours);
router.delete("/:id", supprimerCours);

module.exports = router;
