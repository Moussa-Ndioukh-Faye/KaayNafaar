/**
 * Découverte de sources : l'étudiant donne un sujet, on cherche des pages fiables sur
 * le web (Tavily), il choisit celles à ajouter, et chacune devient un cours du carnet
 * (import protégé contre le SSRF, voir utils/importLien.js).
 */

const { webSearch } = require("../../utils/tavily");
const { creerCoursDepuisLien } = require("../cours");
const { ErreurImport } = require("../../utils/importLien");
const { texte } = require("../normalisation");

const RESULTATS_MAX = 8;
const IMPORTS_MAX = 5;

class ErreurDecouverte extends Error {}

const domaine = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** Recherche de pages sur un sujet ; résultats dédoublonnés, http(s) uniquement */
const rechercherSources = async (sujet) => {
  const requete = texte(sujet, 200);
  if (requete.length < 3) throw new ErreurDecouverte("Décris le sujet en quelques mots.");
  if (!process.env.TAVILY_API_KEY) throw new ErreurDecouverte("La recherche web n'est pas configurée sur le serveur.");

  const resultats = await webSearch(requete, { limit: RESULTATS_MAX + 4, depth: "advanced" });
  const vus = new Set();
  return resultats
    .filter((r) => /^https?:\/\//i.test(r.url || ""))
    .filter((r) => {
      const cle = r.url.replace(/[#?].*$/, "").replace(/\/$/, "");
      if (vus.has(cle)) return false;
      vus.add(cle);
      return true;
    })
    .slice(0, RESULTATS_MAX)
    .map((r) => ({
      titre: texte(r.title, 200) || domaine(r.url),
      url: r.url.slice(0, 2000),
      domaine: domaine(r.url),
      extrait: texte(r.content, 320),
    }));
};

/**
 * Importe les pages choisies ; renvoie les cours créés et les échecs (par URL).
 * Les imports sont faits l'un après l'autre pour ménager le serveur.
 */
const importerSources = async ({ utilisateurId, urls, matiere }) => {
  const uniques = [...new Set((Array.isArray(urls) ? urls : []).filter((u) => typeof u === "string"))].slice(0, IMPORTS_MAX);
  if (!uniques.length) throw new ErreurDecouverte("Choisis au moins une source.");
  const crees = [];
  const echecs = [];
  for (const url of uniques) {
    try {
      const { cours } = await creerCoursDepuisLien({ utilisateurId, url, matiere });
      crees.push(cours);
    } catch (e) {
      echecs.push({ url, message: e instanceof ErreurImport ? e.message : "Page impossible à importer." });
    }
  }
  return { crees, echecs };
};

module.exports = { rechercherSources, importerSources, ErreurDecouverte, IMPORTS_MAX, RESULTATS_MAX };
