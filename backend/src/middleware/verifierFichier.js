/**
 * Contrôle du contenu réel des fichiers importés (OWASP File Upload Cheat Sheet).
 *
 * L'extension et le type MIME sont fournis par le client et peuvent mentir :
 * on lit les premiers octets du fichier (« signature magique ») et on refuse
 * tout fichier dont le contenu ne correspond pas à son extension.
 */

const fs = require("fs/promises");
const path = require("path");
const { supprimerFichier } = require("../utils/fichiers");
const { journaliser } = require("../utils/journalSecurite");

const OCTETS_LUS = 8192;

const commencePar = (tampon, signature) =>
  tampon.length >= signature.length && signature.every((octet, i) => tampon[i] === octet);

// Texte brut : UTF-8 valide et aucun octet nul (un binaire renommé en .txt échoue)
const estTexte = (tampon) => {
  if (tampon.includes(0)) return false;
  try {
    // Un caractère multi-octets peut être coupé en fin de tampon : on retire les 3 derniers octets
    new TextDecoder("utf-8", { fatal: true }).decode(tampon.subarray(0, Math.max(0, tampon.length - 3)));
    return true;
  } catch {
    return false;
  }
};

const VERIFICATIONS = {
  ".pdf": (t) => commencePar(t, [0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
  ".png": (t) => commencePar(t, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ".jpg": (t) => commencePar(t, [0xff, 0xd8, 0xff]),
  ".jpeg": (t) => commencePar(t, [0xff, 0xd8, 0xff]),
  ".txt": estTexte,
  // Word et PowerPoint sont des archives ZIP (signature « PK\x03\x04 »)
  ".docx": (t) => commencePar(t, [0x50, 0x4b, 0x03, 0x04]),
  ".pptx": (t) => commencePar(t, [0x50, 0x4b, 0x03, 0x04]),
};

const lireDebut = async (chemin) => {
  const fichier = await fs.open(chemin, "r");
  try {
    const tampon = Buffer.alloc(OCTETS_LUS);
    const { bytesRead } = await fichier.read(tampon, 0, OCTETS_LUS, 0);
    return tampon.subarray(0, bytesRead);
  } finally {
    await fichier.close();
  }
};

const verifierContenuFichier = async (req, res, next) => {
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname || req.file.filename || "").toLowerCase();
  const verifier = VERIFICATIONS[ext];

  try {
    const debut = await lireDebut(req.file.path);
    if (verifier && debut.length > 0 && verifier(debut)) return next();
  } catch (err) {
    console.error("Lecture du fichier importé:", err.message);
  }

  await supprimerFichier(req.file.path);
  journaliser("fichier.refuse", req, { extension: ext, mime: req.file.mimetype, taille: req.file.size }, "warn");
  return res.status(400).json({
    success: false,
    message: "Le contenu du fichier ne correspond pas à son type. Fichiers acceptés : PDF, Word, PowerPoint, TXT, JPG, PNG.",
  });
};

module.exports = { verifierContenuFichier, VERIFICATIONS };
