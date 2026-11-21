/**
 * Utilitaires fichiers — suppression sûre des fichiers importés
 */

const fs = require("fs/promises");
const path = require("path");

const DOSSIER_UPLOADS = path.resolve(__dirname, "../../uploads");

// Supprime un fichier uniquement s'il se trouve dans uploads/ (pas de traversée de chemin)
const supprimerFichier = async (chemin) => {
  if (!chemin) return;
  const absolu = path.resolve(chemin);
  if (!absolu.startsWith(DOSSIER_UPLOADS + path.sep)) return;
  try {
    await fs.unlink(absolu);
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Suppression fichier:", err.message);
  }
};

module.exports = { supprimerFichier, DOSSIER_UPLOADS };
