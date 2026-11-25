/**
 * Création de cours à partir de texte ou d'une page web, avec indexation en arrière-plan.
 * Point de passage unique pour : import d'un lien, découverte de sources, note → source.
 */

const Course = require("../models/Course");
const { extractionQueue } = require("../utils/worker");
const { importerLien } = require("../utils/importLien");

const borne = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Crée un cours à partir d'un texte et lance son indexation */
const creerCoursDepuisTexte = async ({ utilisateurId, titre, matiere, contenu, tags = [] }) => {
  const cours = await Course.create({
    titre: borne(titre, 200) || "Sans titre",
    matiere: borne(matiere, 100) || "Général",
    contenu,
    niveau: "intermédiaire",
    tags,
    dureeEstimee: Math.max(5, Math.round(String(contenu).split(/\s+/).length / 200)),
    utilisateurId,
    fichierPDF: null,
  });
  extractionQueue
    .add("extraire-et-indexer", {
      coursId: cours.id,
      fichierPath: null,
      originalname: "texte.txt",
      utilisateurId,
      titre: cours.titre,
      contenuDirect: contenu,
    })
    .catch((err) => console.error("Indexation du cours:", err.message));
  return cours;
};

/**
 * Importe une page web (protection SSRF dans importerLien) et en fait un cours.
 * Lève ErreurImport si l'adresse est refusée ou la page inexploitable.
 */
const creerCoursDepuisLien = async ({ utilisateurId, url, titre, matiere }) => {
  const page = await importerLien(url);
  const cours = await creerCoursDepuisTexte({
    utilisateurId,
    titre: borne(titre, 200) || page.titre,
    matiere: borne(matiere, 100) || "Web",
    contenu: page.texte,
    tags: ["web"],
  });
  return { cours, url: page.url };
};

module.exports = { creerCoursDepuisTexte, creerCoursDepuisLien };
