/**
 * Lecture directe des documents par l'IA : vrais fichiers (PDF de 20 pages, PowerPoint),
 * appels Gemini simulés.
 */

const os = require("os");
const path = require("path");
const fsSync = require("fs");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const JSZip = require("jszip");

// Texte brut simulé (le vieil extracteur pdf.js ne lit pas les PDF produits par pdf-lib ;
// les vrais PDF d'étudiants, eux, sont lus normalement)
const mockTexteBrut = { pages: 0 };
jest.mock("pdf-parse", () => async (_buffer, { pagerender }) => {
  for (let k = 1; k <= mockTexteBrut.pages; k += 1) {
    await pagerender({
      getTextContent: async () => ({ items: [{ str: `Contenu de la page ${k} : ${"notion importante ".repeat(8)}`, transform: [0, 0, 0, 0, 0, 1] }] }),
    });
  }
  return { text: "" };
});

process.env.REESSAI_ECHELLE = "0";
const { lireDocument, fusionnerPages, renumeroter, paquets } = require("../src/utils/lectureDocument");

const dossier = fsSync.mkdtempSync(path.join(os.tmpdir(), "lecture-ia-"));

/** PDF de `n` pages, chaque page contenant « Contenu de la page k » (texte réel) */
const creerPdf = async (n) => {
  const doc = await PDFDocument.create();
  const police = await doc.embedFont(StandardFonts.Helvetica);
  for (let k = 1; k <= n; k += 1) {
    const page = doc.addPage([400, 300]);
    page.drawText(`Contenu de la page ${k} : ${"notion importante ".repeat(8)}`, { x: 10, y: 250, size: 6, font: police });
  }
  mockTexteBrut.pages = n;
  const chemin = path.join(dossier, `cours-${n}.pdf`);
  fsSync.writeFileSync(chemin, await doc.save());
  return chemin;
};

/** Réponse Gemini : transcrit le paquet de pages demandé (lu dans la consigne) */
const geminiQuiTranscrit = ({ numerotationRelative = false, pagesSautees = [] } = {}) =>
  jest.fn(async (_url, options) => {
    const corps = JSON.parse(options.body);
    const consigne = corps.contents[0].parts[1].text;
    const [, debut, fin] = consigne.match(/pages (\d+) à (\d+)/).map(Number);
    let texte = "";
    for (let k = debut; k <= fin; k += 1) {
      if (pagesSautees.includes(k)) continue;
      const n = numerotationRelative ? k - debut + 1 : k;
      texte += `<<<PAGE ${n}>>>\n# Page ${k} lue par l'IA\n| Colonne | Valeur |\n|---|---|\n| a | ${k} |\n[Schéma : flèche de A vers B]\n`;
    }
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: texte }] } }] }) };
  });

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test";
  delete process.env.LECTURE_IA;
});
afterAll(() => fsSync.rmSync(dossier, { recursive: true, force: true }));

describe("PDF lu directement par l'IA", () => {
  test("20 pages : lues par paquets de 8, toutes les pages, dans l'ordre, avec progression", async () => {
    global.fetch = geminiQuiTranscrit();
    const progression = [];
    const r = await lireDocument(await creerPdf(20), "pdf", { onProgression: (lues, total) => progression.push([lues, total]) });

    expect(global.fetch).toHaveBeenCalledTimes(3); // 1-8, 9-16, 17-20
    expect(r.methode).toBe("ia");
    expect(r.pages.map((p) => p.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(r.pages[11].texte).toMatch(/Page 12 lue par l'IA/);
    expect(r.texte).toMatch(/\| a \| 20 \|/); // tableaux conservés
    expect(r.texte).toMatch(/\[Schéma : /); // schémas décrits
    expect(progression[0]).toEqual([0, 20]);
    expect(progression[progression.length - 1]).toEqual([20, 20]);
    // Chaque envoi est un vrai PDF partiel, pas le document entier
    const envoye = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].inline_data;
    expect(envoye.mime_type).toBe("application/pdf");
    expect((await PDFDocument.load(Buffer.from(envoye.data, "base64"))).getPageCount()).toBe(8);
  });

  test("le modèle numérote 1, 2, 3… dans chaque paquet : remis aux vrais numéros", async () => {
    global.fetch = geminiQuiTranscrit({ numerotationRelative: true });
    const r = await lireDocument(await creerPdf(12), "pdf");
    expect(r.pages.find((p) => p.n === 10).texte).toMatch(/Page 10 lue/);
  });

  test("une page sautée par l'IA est complétée par le texte brut", async () => {
    global.fetch = geminiQuiTranscrit({ pagesSautees: [5] });
    const r = await lireDocument(await creerPdf(8), "pdf");
    expect(r.methode).toBe("mixte");
    expect(r.pages.find((p) => p.n === 5).texte).toMatch(/Contenu de la page 5/);
  });

  test("Gemini indisponible : le texte brut de toutes les pages est gardé", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 }));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const r = await lireDocument(await creerPdf(3), "pdf");
    spy.mockRestore();
    expect(r.methode).toBe("texte");
    expect(r.pages).toHaveLength(3);
    expect(r.texte).toMatch(/Contenu de la page 2/);
  });

  test("LECTURE_IA=scans : un PDF avec du texte n'utilise pas le quota IA", async () => {
    process.env.LECTURE_IA = "scans";
    global.fetch = jest.fn();
    const r = await lireDocument(await creerPdf(2), "pdf");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(r.methode).toBe("texte");
  });
});

describe("PowerPoint : images et schémas décrits à leur diapositive", () => {
  test("l'image de la diapositive 2 est décrite sur la page 2 ; une icône est ignorée", async () => {
    const zip = new JSZip();
    const diapo = (t) => `<p:sld xmlns:a="a" xmlns:p="p"><a:t>${t}</a:t></p:sld>`;
    zip.file("ppt/slides/slide1.xml", diapo("Introduction"));
    zip.file("ppt/slides/slide2.xml", diapo("Architecture du réseau"));
    zip.file("ppt/slides/_rels/slide2.xml.rels", '<Relationships><Relationship Target="../media/image1.png"/></Relationships>');
    zip.file("ppt/media/image1.png", Buffer.alloc(40 * 1024, 1)); // schéma (assez grand)
    zip.file("ppt/media/puce.png", Buffer.alloc(500, 1)); // pictogramme : ignoré
    const chemin = path.join(dossier, "cours.pptx");
    fsSync.writeFileSync(chemin, await zip.generateAsync({ type: "nodebuffer" }));

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Topologie en étoile : un commutateur relie quatre postes." }] } }] }),
    }));
    const r = await lireDocument(chemin, "pptx");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(r.pages.find((p) => p.n === 2).texte).toMatch(/\[Schéma : Topologie en étoile/);
    expect(r.pages.find((p) => p.n === 1).texte).not.toMatch(/Schéma/);
  });
});

describe("outils", () => {
  test("paquets de pages", () => {
    expect(paquets(20, 8)).toEqual([[1, 8], [9, 16], [17, 20]]);
  });
  test("renumérotation hors plage ignorée", () => {
    expect(renumeroter([{ n: 9, texte: "a" }, { n: 40, texte: "b" }], 9, 16)).toEqual([{ n: 9, texte: "a" }]);
  });
  test("transcription très incomplète : texte brut + schémas vus par l'IA", () => {
    const brut = [{ n: 1, texte: "mot ".repeat(200) }];
    const ia = [{ n: 1, texte: "Titre\n[Schéma : courbe croissante]" }];
    const { pages } = fusionnerPages(brut, ia, 1);
    expect(pages[0].texte).toMatch(/^mot mot/);
    expect(pages[0].texte).toMatch(/\[Schéma : courbe croissante\]$/);
  });
});
