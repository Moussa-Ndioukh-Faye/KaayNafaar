/**
 * Lecture des documents importés — page par page.
 *
 * - PDF « texte » : pdf-parse, une entrée par page (pour citer « p. 4 »).
 * - PDF scanné ou fait de diapositives en images (presque pas de texte) :
 *   transcription par Gemini, qui lit le PDF comme un humain (texte, tableaux,
 *   formules, écriture manuscrite), avec des marqueurs de page.
 * - Photo (cahier, tableau) : Gemini d'abord (bien meilleur sur l'écriture à la main),
 *   Tesseract en secours.
 * - Word, PowerPoint (une page par diapositive), texte brut.
 */

const fs = require("fs").promises;
const pdf = require("pdf-parse");
const { extraireTexteImage } = require("./ocr");
const { extraireDocx, extrairePptx } = require("./extraction");
const { avecReessais } = require("./reessai");
const { modelesGemini, mettreAuRepos } = require("./aiProviderManager");

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TAILLE_MAX_GEMINI = 18 * 1024 * 1024; // requête « inline » limitée à ~20 Mo
const CARACTERES_MIN_PAR_PAGE = 120; // en dessous : PDF considéré comme scanné

const CONSIGNE_TRANSCRIPTION = `Tu transcris fidèlement un support de cours pour un étudiant.
Règles :
- Recopie TOUT le texte lisible, dans l'ordre de lecture, sans résumer ni commenter.
- Commence chaque page par une ligne seule : <<<PAGE n>>> (n = numéro de page, à partir de 1).
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

/** PDF : texte page par page ; si le PDF est scanné, transcription par Gemini */
const lirePdf = async (buffer) => {
  const pages = [];
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

  const total = pages.reduce((s, p) => s + p.texte.length, 0);
  const scanne = pages.length > 0 && total / pages.length < CARACTERES_MIN_PAR_PAGE;
  if (scanne || total === 0) {
    const transcription = await appelerGeminiFichier(buffer, "application/pdf").catch((e) => {
      console.error("[Lecture] Transcription PDF:", e.message);
      return null;
    });
    if (transcription) return { pages: decouperParMarqueurs(transcription), methode: "ia" };
  }
  return { pages: pages.filter((p) => p.texte), methode: "texte" };
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
  return { pages, methode: "texte" };
};

/**
 * @returns {Promise<{ pages: Array<{n:number, texte:string}>, methode: string, texte: string }>}
 */
const lireDocument = async (chemin, extension) => {
  let resultat;
  switch (extension) {
    case "pdf":
      resultat = await lirePdf(await fs.readFile(chemin));
      break;
    case "jpg":
    case "jpeg":
    case "png":
      resultat = await lireImage(chemin, extension);
      break;
    case "docx":
      resultat = { pages: [{ n: 1, texte: (await extraireDocx(chemin)).trim() }], methode: "texte" };
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

module.exports = { lireDocument, decouperParMarqueurs, appelerGeminiFichier, CARACTERES_MIN_PAR_PAGE };
