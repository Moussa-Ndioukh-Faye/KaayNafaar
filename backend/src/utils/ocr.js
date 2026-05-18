/**
 * Utilitaire OCR — Kaay Nafaar
 * Permet d'extraire du texte depuis des images ou des PDF scannés
 */

const Tesseract = require("tesseract.js");
const path = require("path");

/**
 * Reconnaître le texte d'une image ou d'un fichier local
 * @param {string} filePath - Chemin absolu vers le fichier
 * @returns {Promise<string>} - Texte extrait
 */
const extraireTexteImage = async (filePath) => {
  try {
    console.log(`🔍 OCR en cours pour : ${path.basename(filePath)}`);
    
    const { data: { text } } = await Tesseract.recognize(
      filePath,
      'fra+eng', // Langues supportées : Français et Anglais
      { 
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`  🕒 OCR : ${(m.progress * 100).toFixed(0)}%`);
          }
        } 
      }
    );

    console.log("✅ OCR terminé avec succès");
    return text;
  } catch (err) {
    console.error("❌ Erreur OCR:", err.message);
    throw new Error("Échec de la reconnaissance optique de caractères.");
  }
};

module.exports = {
  extraireTexteImage
};
