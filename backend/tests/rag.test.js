/**
 * Moteur de recherche des cours (RAG) : lecture, découpage, indexation, recherche.
 */

const mockQuery = jest.fn();
const mockTransaction = jest.fn(async (fn) => fn("txn"));

jest.mock("../src/config/database", () => ({
  sequelize: {
    query: (...a) => mockQuery(...a),
    transaction: (...a) => mockTransaction(...a),
    QueryTypes: { SELECT: "SELECT" },
    define: jest.fn(() => ({ belongsTo: jest.fn(), hasMany: jest.fn() })),
  },
}));
jest.mock("../src/config/redis", () => ({ redis: null }));
jest.mock("@langchain/google-genai", () => ({
  GoogleGenerativeAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedDocuments: jest.fn(async (textes) => textes.map(() => Array(3072).fill(0.01))),
  })),
}));

const mockPagesPdf = { valeur: [] };
jest.mock("pdf-parse", () =>
  jest.fn(async (_buffer, options) => {
    for (const texte of mockPagesPdf.valeur) {
      await options.pagerender({
        getTextContent: async () => ({ items: texte.split("\n").map((str, i) => ({ str, transform: [0, 0, 0, 0, 0, i] })) }),
      });
    }
    return { text: mockPagesPdf.valeur.join("\n") };
  })
);

const fs = require("fs");
const os = require("os");
const path = require("path");
const { requeteMotsCles, fusionner, diversifier, fusionnerVoisins, libellePage, rechercherPassages, formaterPassages } =
  require("../src/utils/passages");
const { decouperEnPassages, indexerDocument, titreDeSection } = require("../src/utils/indexation");
const { lireDocument, decouperParMarqueurs } = require("../src/utils/lectureDocument");

beforeEach(() => {
  mockQuery.mockReset();
  mockTransaction.mockClear();
  delete global.fetch;
});

describe("Recherche par mots-clés", () => {
  test("relie les mots par OU, sans doublons ni mots vides courts", () => {
    expect(requeteMotsCles("Qu'est-ce que la normalisation, la normalisation ?")).toBe("est | que | normalisation");
  });

  test("ne laisse passer aucun opérateur ni caractère spécial (injection)", () => {
    const r = requeteMotsCles("sql' & !drop | <-> (table) :*");
    expect(r).toBe("sql | drop | table");
    expect(r).not.toMatch(/[&!<>():*']/);
  });

  test("question sans mot utile → rien à chercher", () => {
    expect(requeteMotsCles("à ? !")).toBe("");
  });
});

describe("Fusion et sélection des passages", () => {
  const ligne = (coursId, ordre, texte = `passage ${coursId}-${ordre}`) => ({
    id: `${coursId}-${ordre}`,
    text: texte,
    metadata: { coursId, ordre, page: ordre + 1, pageFin: ordre + 1, titre: `Cours ${coursId}` },
  });

  test("un passage trouvé par les deux recherches passe devant", () => {
    const a = ligne(1, 0);
    const b = ligne(1, 5);
    const classes = fusionner([
      { liste: [b, a], poids: 1 },
      { liste: [a], poids: 0.8 },
    ]);
    expect(classes[0].meta.ordre).toBe(0);
  });

  test("une source ne monopolise pas la réponse quand le carnet en a plusieurs", () => {
    const classes = [0, 1, 2, 3, 4, 5].map((o) => ({ meta: { coursId: 1, ordre: o * 3 }, texte: "x", score: 1 }));
    classes.push({ meta: { coursId: 2, ordre: 0 }, texte: "y", score: 0.1 });
    const choisis = diversifier(classes, 4);
    expect(choisis.map((p) => p.meta.coursId)).toContain(2);
    expect(choisis).toHaveLength(4);
  });

  test("deux passages consécutifs d'un même cours sont réunis, dans l'ordre", () => {
    const res = fusionnerVoisins([
      { meta: { coursId: 1, ordre: 4, page: 5, pageFin: 5 }, texte: "suite" },
      { meta: { coursId: 1, ordre: 3, page: 4, pageFin: 4 }, texte: "début" },
      { meta: { coursId: 2, ordre: 5, page: 1, pageFin: 1 }, texte: "autre" },
    ]);
    expect(res).toHaveLength(2);
    expect(res[0].texte).toBe("début\nsuite");
    expect(res[0].meta).toMatchObject({ page: 4, pageFin: 5, ordre: 3 });
  });

  test("libellé de page pour la citation", () => {
    expect(libellePage({ page: 4, pageFin: 4, total: 10 })).toBe("p. 4");
    expect(libellePage({ page: 4, pageFin: 6, total: 10 })).toBe("p. 4–6");
    expect(libellePage({ page: 1, pageFin: 1, total: 1 })).toBeNull(); // document d'une seule page
    expect(libellePage({})).toBeNull();
  });

  test("recherche : filtrée par étudiant, index HNSW avec balayage itératif, passages numérotés", async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (/^SET LOCAL/.test(sql)) return [];
      if (/halfvec/.test(sql)) return [ligne(7, 2, "La 3FN supprime les dépendances transitives.")];
      if (/to_tsquery/.test(sql)) return [ligne(7, 2, "La 3FN supprime les dépendances transitives."), ligne(7, 9)];
      return [];
    });

    const passages = await rechercherPassages({ question: "Qu'est-ce que la 3FN ?", userId: 42, coursIds: [7], k: 4 });

    const appels = mockQuery.mock.calls;
    const selects = appels.filter(([sql]) => /SELECT/.test(sql));
    expect(selects.length).toBe(2);
    selects.forEach(([sql, opts]) => {
      expect(sql).toMatch(/metadata->>'utilisateurId' = :userId/);
      expect(sql).toMatch(/metadata->>'coursId' IN \(:coursIds\)/);
      expect(opts.replacements.userId).toBe("42");
      expect(opts.replacements.coursIds).toEqual(["7"]);
    });
    expect(appels.some(([sql]) => sql === "SET LOCAL hnsw.iterative_scan = relaxed_order")).toBe(true);

    expect(passages[0]).toMatchObject({ n: 1, coursId: 7, titre: "Cours 7", page: "p. 3" });
    expect(formaterPassages(passages)).toMatch(/^\[1\] \(source : « Cours 7 », p\. 3\)/);
  });

  test("carnet sans source : aucune requête", async () => {
    expect(await rechercherPassages({ question: "x", userId: 1, coursIds: [] })).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test("une recherche en panne n'empêche pas l'autre de répondre", async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (/^SET LOCAL/.test(sql)) throw new Error("vecteurs indisponibles");
      if (/to_tsquery/.test(sql)) return [ligne(3, 0, "réseau IP")];
      return [];
    });
    mockTransaction.mockImplementationOnce(async (fn) => fn("t"));
    const passages = await rechercherPassages({ question: "adresse IP", userId: 1 });
    expect(passages).toHaveLength(1);
    expect(passages[0].texte).toBe("réseau IP");
  });
});

describe("Découpage des cours", () => {
  test("les diapositives courtes sont regroupées, avec leurs pages", async () => {
    const pages = [1, 2, 3, 4].map((n) => ({ n, texte: `Diapo ${n}\n${"contenu ".repeat(20)}` }));
    const passages = await decouperEnPassages(pages);
    expect(passages.length).toBeLessThan(4);
    expect(passages[0]).toMatchObject({ page: 1, ordre: 0 });
    expect(passages[0].pageFin).toBeGreaterThan(1);
  });

  test("une longue page est découpée sans perdre son numéro", async () => {
    const long = Array.from({ length: 40 }, (_, i) => `Phrase numéro ${i} sur les réseaux.`).join(" ");
    const passages = await decouperEnPassages([{ n: 7, texte: `## Routage\n${long}` }]);
    expect(passages.length).toBeGreaterThan(1);
    passages.forEach((p) => expect(p.page).toBe(7));
    expect(passages[0].section).toBe("Routage");
    expect(passages.map((p) => p.ordre)).toEqual(passages.map((_, i) => i));
  });

  test("titre de section : Markdown, ou première ligne courte d'une diapositive", () => {
    expect(titreDeSection("## Les jointures\ntexte")).toBe("Les jointures");
    expect(titreDeSection("Modèle OSI\nsept couches")).toBe("Modèle OSI");
    expect(titreDeSection("Une phrase normale qui finit par un point.\nsuite")).toBeNull();
  });

  test("marqueurs de page de la transcription et du contenu stocké", () => {
    expect(decouperParMarqueurs("<<<PAGE 1>>>\nA\n<<<PAGE 2>>>\nB")).toEqual([
      { n: 1, texte: "A" },
      { n: 2, texte: "B" },
    ]);
    expect(decouperParMarqueurs("— Page 3 —\nC")).toEqual([{ n: 3, texte: "C" }]);
  });
});

describe("Indexation", () => {
  test("remplace les anciens passages du cours puis insère les nouveaux avec leur page", async () => {
    mockQuery.mockResolvedValue([]);
    const n = await indexerDocument({
      coursId: 5,
      utilisateurId: 9,
      titre: "Réseaux",
      pages: [
        { n: 1, texte: "Le modèle OSI comporte sept couches. ".repeat(20) },
        { n: 2, texte: "Le modèle TCP/IP en comporte quatre. ".repeat(20) },
      ],
    });
    expect(n).toBeGreaterThanOrEqual(2);
    const sqls = mockQuery.mock.calls.map(([sql]) => sql.trim());
    const iDelete = sqls.findIndex((s) => s.startsWith("DELETE FROM course_embeddings"));
    const iInsert = sqls.findIndex((s) => s.startsWith("INSERT INTO course_embeddings"));
    expect(iDelete).toBeGreaterThanOrEqual(0);
    expect(iInsert).toBeGreaterThan(iDelete);

    const insertion = mockQuery.mock.calls.find(([sql]) => sql.trim().startsWith("INSERT"));
    const meta = JSON.parse(insertion[1].replacements.meta);
    expect(meta).toMatchObject({ coursId: 5, utilisateurId: 9, titre: "Réseaux", page: 1, ordre: 0 });
    expect(insertion[1].transaction).toBe("txn");
  });

  test("document vide : rien n'est écrit", async () => {
    expect(await indexerDocument({ coursId: 1, utilisateurId: 1, titre: "x", texte: "   " })).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("Lecture des documents", () => {
  const fichier = (nom, contenu = "x") => {
    const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kn-")), nom);
    fs.writeFileSync(p, contenu);
    return p;
  };

  test("PDF avec du texte : lu page par page, sans appel à l'IA", async () => {
    mockPagesPdf.valeur = ["Chapitre 1\n" + "texte ".repeat(60), "Chapitre 2\n" + "suite ".repeat(60)];
    global.fetch = jest.fn();
    const r = await lireDocument(fichier("cours.pdf"), "pdf");
    expect(r.methode).toBe("texte");
    expect(r.pages.map((p) => p.n)).toEqual([1, 2]);
    expect(r.texte).toMatch(/— Page 2 —/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("PDF scanné (diapositives en images) : transcription par Gemini", async () => {
    process.env.GEMINI_API_KEY = "test";
    mockPagesPdf.valeur = ["Philosophy", "", ""];
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "<<<PAGE 1>>>\n# Administration système\n<<<PAGE 2>>>\nLes rôles de l'administrateur" }] } }],
      }),
    }));
    const r = await lireDocument(fichier("diapos.pdf"), "pdf");
    expect(r.methode).toBe("ia");
    expect(r.pages).toEqual([
      { n: 1, texte: "# Administration système" },
      { n: 2, texte: "Les rôles de l'administrateur" },
    ]);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/generateContent$/);
    expect(options.headers["x-goog-api-key"]).toBe("test"); // clé jamais dans l'URL
    expect(JSON.parse(options.body).contents[0].parts[0].inline_data.mime_type).toBe("application/pdf");
  });

  test("si Gemini échoue, le texte trouvé est gardé (pas de plantage)", async () => {
    process.env.GEMINI_API_KEY = "test";
    mockPagesPdf.valeur = ["Titre seul"];
    process.env.REESSAI_ECHELLE = "0";
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 }));
    const r = await lireDocument(fichier("scan.pdf"), "pdf");
    delete process.env.REESSAI_ECHELLE;
    expect(global.fetch.mock.calls.length).toBeGreaterThan(1); // 503 passager : nouvel essai
    expect(r.methode).toBe("texte");
    expect(r.texte).toBe("Titre seul");
  });

  test("PowerPoint : une page par diapositive", async () => {
    jest.resetModules();
    jest.doMock("../src/utils/extraction", () => ({
      extrairePptx: async () => "Diapositive 1\nIntroduction\n\nDiapositive 2\nConclusion",
      extraireDocx: async () => "",
    }));
    const { lireDocument: lire } = require("../src/utils/lectureDocument");
    const r = await lire("/inutile.pptx", "pptx");
    expect(r.pages).toEqual([
      { n: 1, texte: "Introduction" },
      { n: 2, texte: "Conclusion" },
    ]);
  });
});
