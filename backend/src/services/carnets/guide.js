/**
 * Guide du carnet (comme le « guide » de NotebookLM) :
 *  - pour le carnet : un résumé d'ensemble, les sujets clés, des questions à explorer ;
 *  - pour chaque source : un court résumé et ses notions (Course.resumeIA / conceptsCles).
 *
 * Mis en cache : le guide du carnet n'est recalculé que si ses sources changent
 * (empreinte = cours inclus + date de dernière modification de chacun).
 */

const crypto = require("crypto");
const { demanderJSON, ORDRE_RAPIDE } = require("./ia");
const { coursDuCarnet, aDuTexte } = require("./sources");
const { texte } = require("../normalisation");

const SOURCES_PAR_APPEL = 3; // résumés de sources générés au plus par requête (latence bornée)
const CARACTERES_PAR_SOURCE = 12000;
const CARACTERES_GUIDE = 20000;

const ROLE = "Tu es un professeur qui aide un étudiant à se repérer dans ses supports de cours.";

const empreinteSources = (cours) =>
  crypto
    .createHash("sha256")
    .update(
      cours
        .map((c) => `${c.id}:${new Date(c.updatedAt || 0).getTime()}`)
        .sort()
        .join("|")
    )
    .digest("hex")
    .slice(0, 16);

const validerGuideSource = (j) => ({
  resume: texte(j.resume, 1200),
  sujets: (Array.isArray(j.sujets) ? j.sujets : []).map((s) => texte(s, 60)).filter(Boolean).slice(0, 8),
});

const validerGuideCarnet = (j) => ({
  resume: texte(j.resume, 2000),
  sujets: (Array.isArray(j.sujets) ? j.sujets : [])
    .map((s) => ({ titre: texte(s?.titre ?? s, 60), description: texte(s?.description, 240) }))
    .filter((s) => s.titre)
    .slice(0, 8),
  questions: (Array.isArray(j.questions) ? j.questions : []).map((q) => texte(q, 200)).filter(Boolean).slice(0, 6),
});

/** Résumé d'une source ; enregistré sur le cours pour n'être calculé qu'une fois */
const resumerSource = async (cours) => {
  const guide = validerGuideSource(
    await demanderJSON({
      role: ROLE,
      ordre: ORDRE_RAPIDE,
      maxTokens: 700,
      consigne: `Résume cette source en 3 à 5 phrases, puis liste ses 3 à 6 notions principales (2 à 5 mots chacune).
JSON : { "resume": string, "sujets": [string] }`,
      sources: `### ${cours.titre}\n${cours.contenu.slice(0, CARACTERES_PAR_SOURCE)}`,
    })
  );
  if (guide.resume) {
    cours.resumeIA = guide.resume;
    cours.conceptsCles = guide.sujets;
    await cours.save();
  }
  return guide;
};

/**
 * Guide complet d'un carnet.
 * `complet` vaut false tant que des résumés de sources restent à calculer
 * (l'interface redemande le guide quelques secondes plus tard).
 * @returns {Promise<{ resume, sujets, questions, sources: Array<{id, titre, resume, sujets, statut}>, complet: boolean }>}
 */
const obtenirGuide = async (carnet, { forcer = false } = {}) => {
  const cours = await coursDuCarnet(carnet);
  const lisibles = cours.filter(aDuTexte);

  // 1. Résumés de sources manquants (quelques-uns par appel, les suivants au prochain)
  const manquants = lisibles.filter((c) => !c.resumeIA).slice(0, SOURCES_PAR_APPEL);
  await Promise.all(
    manquants.map((c) => resumerSource(c).catch((e) => console.error(`Guide source ${c.id}:`, e.message)))
  );

  const sources = cours.map((c) => ({
    id: c.id,
    titre: c.titre,
    resume: c.resumeIA || null,
    sujets: Array.isArray(c.conceptsCles) ? c.conceptsCles.filter((s) => typeof s === "string") : [],
    statut: !aDuTexte(c) ? "sans_texte" : c.resumeIA ? "pret" : "en_attente",
  }));

  const complet = sources.every((s) => s.statut !== "en_attente");

  // 2. Guide du carnet, recalculé seulement si les sources ont changé
  if (!lisibles.length) return { resume: "", sujets: [], questions: [], sources, complet };
  const empreinte = empreinteSources(lisibles);
  const enCache = carnet.guide || {};
  if (!forcer && enCache.empreinte === empreinte && enCache.resume) {
    return { ...validerGuideCarnet(enCache), sources, complet };
  }

  const parCours = Math.floor(CARACTERES_GUIDE / lisibles.length);
  const guide = validerGuideCarnet(
    await demanderJSON({
      role: ROLE,
      maxTokens: 1500,
      consigne: `Prépare le guide de ce carnet de révision :
- « resume » : vue d'ensemble de toutes les sources en 4 à 6 phrases, en reliant les sources entre elles ;
- « sujets » : 4 à 8 grands sujets, chacun avec une description d'une phrase ;
- « questions » : 5 questions qu'un étudiant devrait savoir traiter, de la plus simple à la plus exigeante.
JSON : { "resume": string, "sujets": [ { "titre": string, "description": string } ], "questions": [string] }`,
      sources: lisibles.map((c) => `### ${c.titre}\n${c.contenu.slice(0, parCours)}`).join("\n\n"),
    })
  );
  carnet.guide = { ...guide, empreinte, genereLe: new Date().toISOString() };
  carnet.changed("guide", true);
  await carnet.save();
  return { ...guide, sources, complet };
};

module.exports = { obtenirGuide, resumerSource, empreinteSources, validerGuideCarnet, validerGuideSource };
