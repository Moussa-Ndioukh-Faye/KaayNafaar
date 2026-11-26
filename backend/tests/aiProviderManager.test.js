/**
 * Gestionnaire IA : découverte des modèles, secours, nouvelles tentatives, flux.
 */

const mockCreer = jest.fn();
const mockLister = jest.fn();
jest.mock("openai", () =>
  jest.fn().mockImplementation(({ baseURL }) => ({
    _fournisseur: baseURL.includes("groq") ? "groq" : "gemini",
    chat: { completions: { create: (p) => mockCreer(baseURL.includes("groq") ? "groq" : "gemini", p) } },
    models: { list: () => mockLister(baseURL.includes("groq") ? "groq" : "gemini") },
  }))
);

const erreur = (status, message = `Erreur ${status}`) => Object.assign(new Error(message), { status });
const reponse = (texte) => ({ choices: [{ message: { content: texte } }] });

let M;
beforeEach(() => {
  jest.resetModules();
  mockCreer.mockReset();
  mockLister.mockReset();
  process.env.GEMINI_API_KEY = "cle-gemini";
  process.env.GROQ_API_KEY = "cle-groq";
  delete process.env.GEMINI_MODEL;
  delete process.env.GROQ_MODEL;
  delete process.env.GEMINI_MODEL_SECOURS;
  M = require("../src/utils/aiProviderManager");
  M._reinitialiser();
});

describe("choix des modèles", () => {
  test("Groq : un modèle retiré n'est plus choisi, le meilleur disponible l'est", () => {
    const dispo = ["whisper-large-v3", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "meta-llama/llama-guard-4-12b"];
    expect(M.choisirModelesGroq(dispo, "llama-3.3-70b-versatile")).toEqual(["openai/gpt-oss-120b", "llama-3.1-8b-instant"]);
  });

  test("Gemini : Flash le plus récent puis Flash-Lite en secours", () => {
    const dispo = ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash-image", "gemini-embedding-2"];
    expect(M.choisirModelesGemini(dispo, "gemini-3.6-flash")).toEqual(["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
    // Modèle configuré introuvable : on prend le plus récent disponible
    expect(M.choisirModelesGemini(dispo, "gemini-9-flash")).toEqual(["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
  });

  test("la découverte remplace un modèle Groq disparu", async () => {
    mockLister.mockImplementation(async (f) =>
      f === "groq" ? { data: [{ id: "openai/gpt-oss-120b" }] } : { data: [{ id: "models/gemini-3.6-flash" }, { id: "models/gemini-3.5-flash-lite" }] }
    );
    const ia = new M.AIProviderManager();
    await M.decouvrirModeles({ forcer: true });
    const etat = ia.etat().fournisseurs;
    expect(etat.find((f) => f.nom === "groq").modeles.map((m) => m.modele)).toEqual(["openai/gpt-oss-120b"]);
    expect(etat.find((f) => f.nom === "gemini").modeles.map((m) => m.modele)).toEqual(["gemini-3.6-flash", "gemini-3.5-flash-lite"]);
  });
});

describe("complete", () => {
  test("Groq 404 (modèle retiré) → redécouverte puis Gemini répond", async () => {
    mockLister.mockResolvedValue({ data: [] });
    mockCreer.mockImplementation(async (f) => {
      if (f === "groq") throw erreur(404, "The model `x` does not exist or you do not have access to it.");
      return reponse("ok gemini");
    });
    const ia = new M.AIProviderManager();
    await expect(ia.complete({ messages: [], ordre: ["groq", "gemini"], optionnel: true })).resolves.toBe("ok gemini");
    expect(mockLister).toHaveBeenCalled();
  });

  test("Gemini 429 → modèle de secours Flash-Lite, et le modèle saturé est mis au repos", async () => {
    delete process.env.GROQ_API_KEY;
    M._reinitialiser();
    mockCreer.mockImplementation(async (_f, { model }) => {
      if (model === "gemini-3.6-flash") throw erreur(429);
      return reponse(`ok ${model}`);
    });
    const ia = new M.AIProviderManager();
    await expect(ia.complete({ messages: [] })).resolves.toBe("ok gemini-3.5-flash-lite");
    expect(ia.etat().fournisseurs[0].modeles[0].reposSecondes).toBeGreaterThan(0);
    // Appel suivant : le modèle au repos n'est pas réessayé en premier
    mockCreer.mockClear();
    await ia.complete({ messages: [] });
    expect(mockCreer.mock.calls[0][1].model).toBe("gemini-3.5-flash-lite");
  });

  test("Gemini 503 passager → nouvel essai sur le même modèle", async () => {
    let n = 0;
    mockCreer.mockImplementation(async (f) => {
      if (f === "gemini" && n++ === 0) throw erreur(503);
      return reponse(`ok ${f}`);
    });
    const ia = new M.AIProviderManager();
    await expect(ia.complete({ messages: [], ordre: ["gemini", "groq"] })).resolves.toBe("ok gemini");
  });

  test("tout échoue → erreur claire pour l'étudiant", async () => {
    mockCreer.mockRejectedValue(erreur(429));
    const ia = new M.AIProviderManager();
    await expect(ia.complete({ messages: [] })).rejects.toThrow(/très demandé/);
  });
});

describe("streamComplete", () => {
  const flux = (morceaux, erreurApres) => ({
    async *[Symbol.asyncIterator]() {
      for (const m of morceaux) yield { choices: [{ delta: { content: m } }] };
      if (erreurApres) throw erreurApres;
    },
  });

  test("échec avant le premier morceau → autre fournisseur, sans doublon", async () => {
    mockCreer.mockImplementation(async (f) => {
      if (f === "gemini") throw erreur(400, "clé invalide");
      return flux(["Bon", "jour"]);
    });
    const deltas = [];
    const onDone = jest.fn();
    const ia = new M.AIProviderManager();
    await ia.streamComplete({ messages: [], onDelta: (d) => deltas.push(d), onDone, ordre: ["gemini", "groq"] });
    expect(deltas.join("")).toBe("Bonjour");
    expect(onDone).toHaveBeenCalledWith("Bonjour");
  });

  test("coupure en cours de réponse → on garde le début et on prévient, sans recommencer", async () => {
    mockCreer.mockImplementation(async () => flux(["Début"], erreur(503)));
    const deltas = [];
    const onDone = jest.fn();
    const ia = new M.AIProviderManager();
    await ia.streamComplete({ messages: [], onDelta: (d) => deltas.push(d), onDone });
    expect(mockCreer).toHaveBeenCalledTimes(1);
    expect(deltas.join("")).toMatch(/^Début.*interrompue/s);
    expect(onDone.mock.calls[0][0]).toMatch(/interrompue/);
  });

  test("aucun modèle ne répond → onError", async () => {
    mockCreer.mockRejectedValue(erreur(401, "Unauthorized"));
    const onError = jest.fn();
    const ia = new M.AIProviderManager();
    await ia.streamComplete({ messages: [], onError });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/indisponible/), expect.anything());
  });
});
