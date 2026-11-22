/**
 * Extraction du texte des documents Office importés comme sources.
 * - Word (.docx)       : mammoth (texte brut, sans mise en forme)
 * - PowerPoint (.pptx) : lecture des diapositives XML (texte des zones <a:t>), dans l'ordre
 * Bornes anti « bombe zip » : nombre de diapositives et taille décompressée limités.
 */

const fs = require("fs/promises");
const mammoth = require("mammoth");
const JSZip = require("jszip");

const MAX_DIAPOS = 300;
const MAX_TEXTE = 2_000_000; // caractères

const extraireDocx = async (chemin) => {
  const { value } = await mammoth.extractRawText({ path: chemin });
  return (value || "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXTE);
};

const decoderEntites = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

const extrairePptx = async (chemin) => {
  const zip = await JSZip.loadAsync(await fs.readFile(chemin));
  const diapos = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .slice(0, MAX_DIAPOS);
  if (!diapos.length) throw new Error("Présentation sans diapositive lisible");

  const parties = [];
  let total = 0;
  for (const [i, nom] of diapos.entries()) {
    const xml = await zip.file(nom).async("string");
    const paragraphes = xml
      .split(/<\/a:p>/)
      .map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decoderEntites(m[1])).join(""))
      .filter((t) => t.trim());
    const bloc = `Diapositive ${i + 1}\n${paragraphes.join("\n")}`;
    total += bloc.length;
    if (total > MAX_TEXTE) break;
    parties.push(bloc);
  }
  return parties.join("\n\n").trim();
};

module.exports = { extraireDocx, extrairePptx };
