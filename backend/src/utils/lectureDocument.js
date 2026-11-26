/**
 * Lecture des documents importés — l'IA lit le document lui-même, page par page.
 *
 * - PDF : Gemini lit directement le fichier, comme un humain : texte, tableaux, formules,
 *   schémas décrits, écriture manuscrite, diapositives en images. Le PDF est découpé en
 *   paquets de pages (sinon la réponse d'un long cours serait tronquée), lus deux à la fois.
 *   Le texte brut (pdf-parse) sert de secours page par page : rien n'est perdu si l'IA
 *   échoue ou saute une page.
 * - Photo (cahier, tableau) : Gemini d'abord, Tesseract en secours.
 * - Word, PowerPoint (une page par diapositive) : texte extrait, puis l'IA décrit les
 *   images et schémas intégrés, à leur place (diapositive) ou en fin de document (Word).
 * - LECTURE_IA=scans : l'IA ne lit que les PDF scannés (économie de quota).
 */

const fs = require("fs").promises;
const pdf = require("pdf-parse");
const { extraireTexteImage } = require("./ocr");
const { extraireDocx, extrairePptx } = require("./extraction");
const { avecReessais } = require("./reessai");
const { modelesGemini, mettreAuRepos } = require("./aiProviderManager");
const { PDFDocument } = require("pdf-lib");
const JSZip = require("jszip");

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TAILLE_MAX_GEMINI = 18 * 1024 * 1024; // requête « inline » limitée à ~20 Mo
const CARACTERES_MIN_PAR_PAGE = 120; // en dessous : PDF considéré comme scanné
const PAGES_PAR_LOT = Number(process.env.LECTURE_IA_PAGES_PAR_LOT || 8);
const PAGES_IA_MAX = Number(process.env.LECTURE_IA_PAGES_MAX || 300); // au-delà : texte brut
const LOTS_EN_PARALLELE = 2;
const IMAGES_MAX = 20; // images décrites par document Word/PowerPoint
const IMAGE_TAILLE_MIN = 15 * 1024; // en dessous : icône, puce, logo
const lectureIaToujours = () => (process.env.LECTURE_IA || "toujours") !== "scans";

const CONSIGNE_TRANSCRIPTION = `Tu transcris fidèlement un support de cours pour un étudiant.
Règles :
- Recopie TOUT le texte lisible, dans l'ordre de lecture, sans résumer ni commenter.
- Commence chaque page par une ligne seule : <<<PAGE n>>> (n = numéro de page, à partir de 1).
- Recopie aussi le texte des en-têtes de tableaux, légendes et encadrés ; ignore les numéros de page et pieds de page répétés.
- Titres en Markdown (#, ##), listes avec « - », tableaux en Markdown.
- Formules mathématiques en LaTeX entre $…$.
- Schémas ou images : une ligne [Schéma : description courte et précise].
- Écriture manuscrite : transcris-la ; mot illisible → [illisible].
- Ne rajoute aucune information absente du document.`;

const appelerGeminiFichier = async (buffer, mimeType, consigne = CONSIGNE_TRANSCRIPTION) => {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle || buffer.length > TAILLE_MAX_GEMINI) return null;
  // Modèles retenus par le gestionnaire (découverts au démarrage, hors modèles au repos)
  const modeles = [
    process.env.GEMINI_VISION_MODEL,
    ...modelesGemini(),
    process.env.GEMINI_MODEL || "gemini-3.6-flash",
  ].filter((m, i, t) => m && t.indexOf(m) === i);
  const corps = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ inline_data: { mime_type: mimeType, data: buffer.toString("base64") } }, { text: consigne }],
      },
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 32768 },
  });

  for (const modele of modeles) {
    try {
      const donnees = await avecReessais(
        async () => {
          const reponse = await fetch(`${GEMINI_URL}/${encodeURIComponent(modele)}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
            body: corps,
            signal: AbortSignal.timeout(180000),
          });
          if (!reponse.ok) throw Object.assign(new Error(`Gemini ${reponse.status}`), { status: reponse.status });
          return reponse.json();
        },
        { tentatives: 3, base: 2500, quoi: `Lecture du document (${modele})` }
      );
      const texte = (donnees.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
      if (texte) return texte;
    } catch (err) {
      console.error(`[Lecture] ${modele} : ${err.status || err.message}`);
      if (err.status === 429) mettreAuRepos(modele, 60000);
    }
  }
  return null;
};

/** Sépare un texte « <<<PAGE n>>> … » (transcription) ou « — Page n — » (contenu stocké) en pages */
const decouperParMarqueurs = (texte) => {
  const morceaux = String(texte || "").split(/^\s*(?:<<<PAGE\s+(\d+)>>>|— Page (\d+) —)\s*$/m);
  const pages = [];
  if (morceaux[0].trim()) pages.push({ n: 1, texte: morceaux[0].trim() });
  // split avec deux groupes : [avant, g1, g2, texte, g1, g2, texte…]
  for (let i = 1; i < morceaux.length; i += 3) {
    const t = (morceaux[i + 2] || "").trim();
    if (t) pages.push({ n: Number(morceaux[i] || morceaux[i + 1]) || pages.length + 1, texte: t });
  }
  return pages.length ? pages : [{ n: 1, texte: String(texte || "").trim() }];
};

/** Texte brut de chaque page (pdf-parse) : rapide, gratuit, sert de secours */
const extrairePagesPdf = async (buffer) => {
  const pages = [];
  try {
    await pdf(buffer, {
      pagerender: async (page) => {
        const contenu = await page.getTextContent({ normalizeWhitespace: true });
        let derniereY = null;
        let texte = "";
        for (const item of contenu.items) {
          const y = item.transform?.[5];
          if (derniereY !== null && y !== derniereY) texte += "\n";
          texte += item.str;
          derniereY = y;
        }
        pages.push({ n: pages.length + 1, texte: texte.trim() });
        return texte;
      },
    });
  } catch (err) {
    console.error("[Lecture] Texte du PDF illisible :", err.message);
  }
  return pages;
};

/** Paquets de pages [début, fin] (1-indexés) */
const paquets = (total, taille = PAGES_PAR_LOT) => {
  const liste = [];
  for (let debut = 1; debut <= total; debut += taille) liste.push([debut, Math.min(total, debut + taille - 1)]);
  return liste;
};

/** Extrait les pages [debut, fin] dans un nouveau PDF ; redécoupe si le morceau est trop lourd */
const extrairePaquet = async (source, debut, fin) => {
  const doc = await PDFDocument.create();
  const indices = Array.from({ length: fin - debut + 1 }, (_, k) => debut - 1 + k);
  (await doc.copyPages(source, indices)).forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save());
};

/** Ramène les numéros de page de la transcription d'un paquet aux numéros réels */
const renumeroter = (pages, debut, fin) => {
  const attendus = fin - debut + 1;
  const numeros = pages.map((p) => p.n);
  // Le modèle a numéroté 1, 2, 3… au lieu de debut, debut+1… : décalage
  const relatif = debut > 1 && Math.max(...numeros) <= attendus && !numeros.some((n) => n >= debut && n <= fin && n > attendus);
  return pages
    .map((p) => ({ ...p, n: relatif ? p.n + debut - 1 : p.n }))
    .filter((p) => p.n >= debut && p.n <= fin);
};

/** Lit un paquet de pages par l'IA ; si le morceau est trop lourd, il est coupé en deux */
const lirePaquetIA = async (source, debut, fin) => {
  const morceau = await extrairePaquet(source, debut, fin);
  if (morceau.length > TAILLE_MAX_GEMINI && fin > debut) {
    const milieu = Math.floor((debut + fin) / 2);
    return [...(await lirePaquetIA(source, debut, milieu)), ...(await lirePaquetIA(source, milieu + 1, fin))];
  }
  const consigne = `${CONSIGNE_TRANSCRIPTION}
- Ce fichier contient les pages ${debut} à ${fin} du cours : numérote-les de ${debut} à ${fin}.`;
  const transcription = await appelerGeminiFichier(morceau, "application/pdf", consigne);
  return transcription ? renumeroter(decouperParMarqueurs(transcription), debut, fin) : [];
};

/** Exécute des tâches avec au plus `n` en même temps (quota par minute de Gemini) */
const parLots = async (taches, n) => {
  const resultats = new Array(taches.length);
  let suivant = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, taches.length) }, async () => {
      while (suivant < taches.length) {
        const i = suivant;
        suivant += 1;
        resultats[i] = await taches[i]().catch((err) => {
          console.error("[Lecture] Paquet de pages :", err.message);
          return [];
        });
      }
    })
  );
  return resultats;
};

/**
 * Fusionne, page par page, la lecture de l'IA et le texte brut :
 * l'IA d'abord (tableaux, schémas, formules) ; si elle a sauté une page ou en a manqué
 * une bonne partie, le texte brut la complète.
 */
const fusionnerPages = (pagesTexte, pagesIA, total) => {
  const ia = new Map(pagesIA.map((p) => [p.n, p.texte]));
  const brut = new Map(pagesTexte.map((p) => [p.n, p.texte]));
  const pages = [];
  let lues = 0;
  for (let n = 1; n <= total; n += 1) {
    const texteIA = (ia.get(n) || "").trim();
    const texteBrut = (brut.get(n) || "").trim();
    let texte = texteIA;
    if (texteIA) lues += 1;
    if (!texteIA) texte = texteBrut;
    else if (texteBrut.length > 300 && texteIA.length < texteBrut.length * 0.4) {
      // Transcription manifestement incomplète : texte brut + ce que seule l'IA voit (schémas)
      const schemas = texteIA.split("\n").filter((l) => /^\[Schéma/.test(l.trim()));
      texte = [texteBrut, ...schemas].join("\n");
    }
    if (texte) pages.push({ n, texte });
  }
  return { pages, lues };
};

/** PDF : lecture directe par l'IA (par paquets), texte brut en secours */
const lirePdf = async (buffer, { onProgression } = {}) => {
  const pagesTexte = await extrairePagesPdf(buffer);
  const totalTexte = pagesTexte.reduce((s, p) => s + p.texte.length, 0);
  const scanne = !pagesTexte.length || totalTexte / pagesTexte.length < CARACTERES_MIN_PAR_PAGE;

  if (!process.env.GEMINI_API_KEY || (!scanne && !lectureIaToujours())) {
    return { pages: pagesTexte.filter((p) => p.texte), methode: "texte" };
  }

  let source = null;
  try {
    source = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err) {
    console.error("[Lecture] PDF non découpable :", err.message);
  }

  // PDF impossible à découper (protégé, abîmé) : envoi tel quel s'il n'est pas trop lourd
  if (!source) {
    const transcription = await appelerGeminiFichier(buffer, "application/pdf").catch(() => null);
    if (transcription) return { pages: decouperParMarqueurs(transcription), methode: "ia" };
    return { pages: pagesTexte.filter((p) => p.texte), methode: "texte" };
  }

  const total = source.getPageCount();
  const aLire = Math.min(total, PAGES_IA_MAX);
  const debutLecture = Date.now();
  let pagesLues = 0;
  onProgression?.(0, total);
  const resultats = await parLots(
    paquets(aLire).map(([debut, fin]) => async () => {
      const lu = await lirePaquetIA(source, debut, fin);
      pagesLues += fin - debut + 1;
      onProgression?.(Math.min(pagesLues, total), total);
      return lu;
    }),
    LOTS_EN_PARALLELE
  );
  const { pages, lues } = fusionnerPages(pagesTexte, resultats.flat(), total);
  console.log(
    `[Lecture] PDF de ${total} page(s) : ${lues} lue(s) par l'IA en ${Math.round((Date.now() - debutLecture) / 1000)} s` +
      (total > aLire ? ` (pages ${aLire + 1}-${total} : texte brut)` : "")
  );
  const methode = lues === 0 ? "texte" : lues >= pages.length ? "ia" : "mixte";
  return { pages, methode };
};

/* ── Images intégrées aux documents Word et PowerPoint ──────────── */

const MIME_IMAGES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };

const CONSIGNE_IMAGE = `Cette image vient d'un support de cours. Décris-la pour un étudiant qui ne la voit pas :
- schéma, graphique, tableau, capture : ce qu'il montre, ses éléments et leurs liens, les valeurs lisibles ;
- recopie tout texte lisible dans l'image.
Une à cinq phrases, en français, sans introduction. Si l'image est purement décorative (logo, fond, icône), réponds seulement : DECORATIVE`;

/** Décrit une image par l'IA ; null si décorative ou en cas d'échec */
const decrireImage = async (buffer, mime) => {
  const texte = await appelerGeminiFichier(buffer, mime, CONSIGNE_IMAGE).catch(() => null);
  if (!texte || /^\s*DECORATIVE/i.test(texte)) return null;
  return texte.replace(/\s+/g, " ").trim();
};

/** Images d'un fichier Office (zip), avec, pour PowerPoint, la diapositive où elles se trouvent */
const imagesOffice = async (chemin, dossierMedia) => {
  const zip = await JSZip.loadAsync(await fs.readFile(chemin));
  const diapoDe = new Map(); // nom du média → numéro de diapositive
  for (const nom of Object.keys(zip.files)) {
    const m = nom.match(/^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/);
    if (!m) continue;
    const rels = await zip.file(nom).async("string");
    for (const [, cible] of rels.matchAll(/Target="\.\.\/media\/([^"]+)"/g)) {
      if (!diapoDe.has(cible)) diapoDe.set(cible, Number(m[1]));
    }
  }
  const images = [];
  for (const [nom, fichier] of Object.entries(zip.files)) {
    if (!nom.startsWith(dossierMedia) || fichier.dir) continue;
    const ext = nom.split(".").pop().toLowerCase();
    if (!MIME_IMAGES[ext]) continue;
    const buffer = await fichier.async("nodebuffer");
    if (buffer.length < IMAGE_TAILLE_MIN || buffer.length > TAILLE_MAX_GEMINI) continue;
    const court = nom.slice(dossierMedia.length);
    images.push({ buffer, mime: MIME_IMAGES[ext], diapo: diapoDe.get(court) || null, taille: buffer.length });
  }
  // Les plus grandes d'abord (schémas plutôt que pictogrammes), dans la limite fixée
  return images.sort((a, b) => b.taille - a.taille).slice(0, IMAGES_MAX).sort((a, b) => (a.diapo || 0) - (b.diapo || 0));
};

/** Ajoute aux pages la description des images intégrées (si la clé IA est configurée) */
const ajouterImagesDecrites = async (chemin, pages, dossierMedia) => {
  if (!process.env.GEMINI_API_KEY || !lectureIaToujours()) return { pages, decrites: 0 };
  let images = [];
  try {
    images = await imagesOffice(chemin, dossierMedia);
  } catch (err) {
    console.error("[Lecture] Images du document :", err.message);
    return { pages, decrites: 0 };
  }
  const descriptions = await parLots(images.map((img) => () => decrireImage(img.buffer, img.mime)), LOTS_EN_PARALLELE);
  const parPage = new Map();
  const finDocument = [];
  images.forEach((img, i) => {
    if (!descriptions[i]) return;
    const ligne = `[Schéma : ${descriptions[i]}]`;
    if (img.diapo && pages.some((p) => p.n === img.diapo)) {
      parPage.set(img.diapo, [...(parPage.get(img.diapo) || []), ligne]);
    } else finDocument.push(ligne);
  });
  const resultat = pages.map((p) => (parPage.has(p.n) ? { ...p, texte: `${p.texte}\n${parPage.get(p.n).join("\n")}` } : p));
  if (finDocument.length) {
    const derniere = resultat[resultat.length - 1];
    if (derniere) derniere.texte = `${derniere.texte}\n\n## Schémas et images du document\n${finDocument.join("\n")}`;
    else resultat.push({ n: 1, texte: finDocument.join("\n") });
  }
  return { pages: resultat, decrites: descriptions.filter(Boolean).length };
};

const lireImage = async (chemin, extension) => {
  const buffer = await fs.readFile(chemin);
  const mime = extension === "png" ? "image/png" : "image/jpeg";
  const transcription = await appelerGeminiFichier(buffer, mime).catch(() => null);
  if (transcription) return { pages: decouperParMarqueurs(transcription), methode: "ia" };
  const texte = await extraireTexteImage(chemin);
  return { pages: [{ n: 1, texte: (texte || "").trim() }], methode: "ocr" };
};

const lirePptx = async (chemin) => {
  const texte = await extrairePptx(chemin);
  const pages = texte
    .split(/^Diapositive \d+\s*$/m)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({ n: i + 1, texte: t }));
  const avecImages = await ajouterImagesDecrites(chemin, pages, "ppt/media/");
  return { pages: avecImages.pages, methode: avecImages.decrites ? "mixte" : "texte" };
};

const lireDocx = async (chemin) => {
  const pages = [{ n: 1, texte: (await extraireDocx(chemin)).trim() }];
  const avecImages = await ajouterImagesDecrites(chemin, pages, "word/media/");
  return { pages: avecImages.pages, methode: avecImages.decrites ? "mixte" : "texte" };
};

/**
 * @returns {Promise<{ pages: Array<{n:number, texte:string}>, methode: string, texte: string }>}
 */
const lireDocument = async (chemin, extension, options = {}) => {
  let resultat;
  switch (extension) {
    case "pdf":
      resultat = await lirePdf(await fs.readFile(chemin), options);
      break;
    case "jpg":
    case "jpeg":
    case "png":
      resultat = await lireImage(chemin, extension);
      break;
    case "docx":
      resultat = await lireDocx(chemin);
      break;
    case "pptx":
      resultat = await lirePptx(chemin);
      break;
    case "txt":
      resultat = { pages: [{ n: 1, texte: (await fs.readFile(chemin, "utf8")).trim() }], methode: "texte" };
      break;
    default:
      resultat = { pages: [], methode: "aucune" };
  }
  resultat.pages = resultat.pages.filter((p) => p.texte);
  resultat.texte = resultat.pages.length > 1
    ? resultat.pages.map((p) => `— Page ${p.n} —\n${p.texte}`).join("\n\n")
    : resultat.pages[0]?.texte || "";
  return resultat;
};

module.exports = {
  lireDocument,
  decouperParMarqueurs,
  appelerGeminiFichier,
  fusionnerPages,
  renumeroter,
  paquets,
  CARACTERES_MIN_PAR_PAGE,
};
