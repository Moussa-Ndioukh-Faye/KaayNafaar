jest.mock("../src/config/database", () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    define: jest.fn(() => ({ belongsTo: jest.fn(), hasMany: jest.fn() })),
  },
  connectDB: jest.fn().mockResolvedValue(),
}));

jest.mock("../src/utils/worker", () => ({
  extractionQueue: { add: jest.fn().mockResolvedValue({}) },
  worker: { close: jest.fn() },
}));

const mockUsers = [];

jest.mock("../src/models/User", () => {
  const bcrypt = require("bcryptjs");
  const M = function (d) { Object.assign(this, d || {}); };
  M.findOne = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const found = mockUsers.find((u) =>
      where.email ? u.email === where.email : where.id ? u.id === where.id : false
    );
    return found ? Object.assign(new M(), found) : null;
  });
  M.findByPk = jest.fn(async (id) => {
    const found = mockUsers.find((u) => u.id === id);
    return found ? Object.assign(new M(), found) : null;
  });
  M.create = jest.fn(async (data) => {
    if (!data || !data.motDePasse) return { id: mockUsers.length + 1, ...data };
    const hashed = await bcrypt.hash(data.motDePasse, 4);
    const entry = { id: mockUsers.length + 1, ...data, motDePasse: hashed };
    mockUsers.push(entry);
    return Object.assign(new M(), entry);
  });
  M.destroy = jest.fn(async () => { mockUsers.length = 0; });
  M.update = jest.fn().mockResolvedValue([1]);
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  M.hasOne = jest.fn();
  M.prototype.verifierMotDePasse = async function (pwd) {
    return bcrypt.compare(pwd, this.motDePasse);
  };
  M.prototype.save = jest.fn(async function () { return this; });
  M.prototype.update = jest.fn(async function (d) { Object.assign(this, d); return this; });
  M.prototype.destroy = jest.fn(async function () {});
  return M;
});

jest.mock("../src/models/Progression", () => {
  const M = function () {};
  M.findOne = jest.fn().mockResolvedValue(null);
  M.create = jest.fn().mockResolvedValue({ id: 1 });
  M.destroy = jest.fn().mockResolvedValue();
  M.update = jest.fn().mockResolvedValue([1]);
  M.belongsTo = jest.fn();
  return M;
});


jest.mock("../src/models/Fiche", () => require("./support/modeleMemoire")("Fiche"));
jest.mock("../src/models/Quiz", () => require("./support/modeleMemoire")("Quiz"));

jest.mock("../src/models/FeedbackIA", () => {
  const M = function () {};
  M.destroy = jest.fn().mockResolvedValue();
  M.findAll = jest.fn().mockResolvedValue([]);
  M.belongsTo = jest.fn();
  return M;
});

// ── Cours et carnets en mémoire ──────────────────────────────────
const mockCours = [];
const mockCarnets = [];

jest.mock("../src/models/Course", () => {
  const M = function () {};
  const correspond = (c, where = {}) =>
    (where.utilisateurId === undefined || c.utilisateurId === where.utilisateurId) &&
    (where.id === undefined || (Array.isArray(where.id) ? where.id.map(Number).includes(c.id) : c.id === Number(where.id)));
  const instance = (c) => ({
    ...c,
    toJSON: () => ({ ...c }),
    async save() {
      const i = mockCours.findIndex((x) => x.id === c.id);
      mockCours[i] = { ...mockCours[i], resumeIA: this.resumeIA, conceptsCles: this.conceptsCles };
      return this;
    },
  });
  M.findAll = jest.fn(async ({ where } = {}) => mockCours.filter((c) => correspond(c, where)).map(instance));
  M.destroy = jest.fn().mockResolvedValue();
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  return M;
});

jest.mock("../src/models/Carnet", () => {
  let suivant = 1;
  const donnees = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v !== "function"));
  const instance = (ligne) => ({
    ...ligne,
    toJSON() {
      return donnees(this);
    },
    changed() {},
    async save() {
      const i = mockCarnets.findIndex((c) => c.id === this.id);
      mockCarnets[i] = { ...donnees(this), updatedAt: new Date().toISOString() };
      return this;
    },
    async destroy() {
      mockCarnets.splice(mockCarnets.findIndex((c) => c.id === this.id), 1);
    },
  });
  const M = function () {};
  M.create = jest.fn(async (d) => {
    const ligne = { id: suivant++, notes: [], studio: {}, guide: {}, reglages: {}, coursIds: [], ...d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mockCarnets.push(ligne);
    return instance({ ...ligne });
  });
  M.findOne = jest.fn(async ({ where }) => {
    const l = mockCarnets.find((c) => c.id === Number(where.id) && c.utilisateurId === where.utilisateurId);
    return l ? instance({ ...l }) : null;
  });
  M.findAll = jest.fn(async ({ where }) => mockCarnets.filter((c) => c.utilisateurId === where.utilisateurId).map((l) => instance({ ...l })));
  M.destroy = jest.fn().mockResolvedValue();
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  return M;
});

jest.mock("../src/utils/passages", () => ({
  rechercherPassages: jest.fn(async () => [
    { n: 1, coursId: 1, titre: "Réseaux", page: "p. 2", texte: "SSH utilise le port 22." },
    { n: 2, coursId: 1, titre: "Réseaux", page: "p. 3", texte: "SSH remplace Telnet." },
  ]),
  formaterPassages: jest.fn((p) => p.map((x) => `[${x.n}] ${x.texte}`).join("\n")),
}));

// Réponses de l'IA : file de réponses (une par appel), sinon `reponse` par défaut
const mockIA = { reponse: "{}", file: [], appels: [] };
jest.mock("../src/utils/aiProviderManager", () => ({
  AIProviderManager: function () {
    this.estDisponible = () => true;
    this.complete = jest.fn(async ({ messages }) => {
      mockIA.appels.push(messages);
      return mockIA.file.length ? mockIA.file.shift() : mockIA.reponse;
    });
    this.streamComplete = jest.fn(async ({ onDelta, onDone, messages }) => {
      mockIA.derniersMessages = messages;
      onDelta("SSH écoute sur le port 22 [1].");
      await onDone("SSH écoute sur le port 22 [1].");
    });
  },
}));

const mockWeb = { resultats: [] };
jest.mock("../src/utils/tavily", () => ({ webSearch: jest.fn(async () => mockWeb.resultats) }));
jest.mock("../src/services/cours", () => {
  let suivant = 100;
  const creer = async ({ utilisateurId, titre, matiere, contenu, tags }) => {
    const cours = { id: suivant++, utilisateurId, titre, matiere, contenu, tags };
    mockCours.push(cours);
    return cours;
  };
  return {
    creerCoursDepuisTexte: jest.fn(creer),
    creerCoursDepuisLien: jest.fn(async ({ utilisateurId, url }) => {
      if (url.includes("interdit")) {
        const { ErreurImport } = require("../src/utils/importLien");
        throw new ErreurImport("Adresse refusée.");
      }
      return { cours: await creer({ utilisateurId, titre: `Page ${url}`, matiere: "Web", contenu: "x".repeat(300), tags: ["web"] }), url };
    }),
  };
});

const request = require("supertest");
const app = require("../server");
const CarnetMessage = require("../src/models/CarnetMessage");
const { rechercherPassages } = require("../src/utils/passages");
const { limiteurIA } = require("../src/middleware/securite");
const { _reinitialiserQuotas } = require("../src/middleware/quotaIA");

const compte = async (email) => {
  const res = await request(app).post("/api/auth/inscription").send({ nom: "Awa Ndiaye", email, motDePasse: "secret123" });
  return { cookie: res.headers["set-cookie"], id: mockUsers.find((u) => u.email === email).id };
};

/** Événements d'un flux SSE */
const evenementsSSE = (res) =>
  res.text
    .split("\n\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l.replace(/^data: /, "")));

describe("Carnets", () => {
  let awa;
  let fatou;
  let id;

  beforeAll(async () => {
    awa = await compte("awa.carnet@test.com");
    fatou = await compte("fatou.carnet@test.com");
    mockCours.push(
      { id: 1, utilisateurId: awa.id, titre: "Réseaux", matiere: "Réseaux", contenu: "SSH utilise le port 22. ".repeat(20), updatedAt: new Date(1) },
      { id: 2, utilisateurId: awa.id, titre: "SQL", matiere: "BD", contenu: "La 3FN élimine les dépendances transitives. ".repeat(10), updatedAt: new Date(1) },
      { id: 9, utilisateurId: fatou.id, titre: "Cours privé de Fatou", matiere: "Secret", contenu: "Ne doit jamais fuiter." }
    );
  });

  beforeEach(() => {
    mockIA.reponse = "{}";
    mockIA.file = [];
    mockIA.appels = [];
    // Les limites (10 appels IA/min par IP, quota quotidien) restent actives, mais
    // chaque test repart de zéro : ici tous les appels viennent de la même adresse.
    ["::ffff:127.0.0.1", "127.0.0.1", "::1"].forEach((ip) => limiteurIA.resetKey(ip));
    _reinitialiserQuotas();
  });

  describe("Gestion et isolement", () => {
    test("crée un carnet en ne gardant que les cours de l'étudiant", async () => {
      const res = await request(app)
        .post("/api/carnets")
        .set("Cookie", awa.cookie)
        .send({ titre: "Partiel réseaux", coursIds: [1, 2, 9, "x"] });
      expect(res.status).toBe(201);
      id = res.body.carnet.id;
      expect(res.body.carnet.coursIds).toEqual([1, 2]); // le cours 9 (de Fatou) est écarté
      expect(res.body.carnet.sources.map((s) => s.titre)).toEqual(["Réseaux", "SQL"]);
      expect(res.body.carnet.reglages).toEqual({ style: "defaut", longueur: "normale", consignes: "", langue: "fr" });
    });

    test("un autre étudiant ne voit, ne modifie et n'interroge pas ce carnet", async () => {
      const f = fatou.cookie;
      expect((await request(app).get(`/api/carnets/${id}`).set("Cookie", f)).status).toBe(404);
      expect((await request(app).put(`/api/carnets/${id}`).set("Cookie", f).send({ titre: "Piraté" })).status).toBe(404);
      expect((await request(app).post(`/api/carnets/${id}/chat`).set("Cookie", f).send({ question: "?" })).status).toBe(404);
      expect((await request(app).get(`/api/carnets/${id}/guide`).set("Cookie", f)).status).toBe(404);
      expect((await request(app).get(`/api/carnets/${id}/messages`).set("Cookie", f)).status).toBe(404);
      expect((await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", f).send({ type: "faq" })).status).toBe(404);
      const liste = await request(app).get("/api/carnets").set("Cookie", f);
      expect(liste.body.carnets).toEqual([]);
    });

    test("les réglages du chat sont validés (valeurs inconnues remplacées, consignes bornées)", async () => {
      const res = await request(app)
        .put(`/api/carnets/${id}/reglages`)
        .set("Cookie", awa.cookie)
        .send({ style: "guide", longueur: "infinie", consignes: "Donne des exemples sénégalais. ".repeat(50), langue: "klingon" });
      expect(res.status).toBe(200);
      expect(res.body.reglages).toMatchObject({ style: "guide", longueur: "normale", langue: "fr" });
      expect(res.body.reglages.consignes.length).toBe(600);
    });
  });

  describe("Guide", () => {
    test("résume chaque source puis le carnet, et ne régénère pas tant que rien ne change", async () => {
      mockIA.file = [
        JSON.stringify({ resume: "SSH sécurise l'accès distant.", sujets: ["SSH", "Port 22"] }),
        JSON.stringify({ resume: "La 3FN.", sujets: ["Normalisation"] }),
        JSON.stringify({ resume: "Vue d'ensemble.", sujets: [{ titre: "Sécurité", description: "SSH" }], questions: ["Pourquoi SSH ?"] }),
      ];
      const res = await request(app).get(`/api/carnets/${id}/guide`).set("Cookie", awa.cookie);
      expect(res.status).toBe(200);
      expect(res.body.guide).toMatchObject({ resume: "Vue d'ensemble.", questions: ["Pourquoi SSH ?"], complet: true });
      expect(res.body.guide.sources.find((s) => s.id === 1)).toMatchObject({ resume: "SSH sécurise l'accès distant.", statut: "pret" });
      expect(mockIA.appels).toHaveLength(3);

      const encore = await request(app).get(`/api/carnets/${id}/guide`).set("Cookie", awa.cookie);
      expect(encore.body.guide.resume).toBe("Vue d'ensemble.");
      expect(mockIA.appels).toHaveLength(3); // servi depuis le cache, aucun nouvel appel
    });
  });

  describe("Chat", () => {
    test("envoie les passages, la réponse citée, des relances, et enregistre l'échange", async () => {
      mockIA.reponse = JSON.stringify({ questions: ["Et Telnet ?", "Quel chiffrement ?", "Port par défaut ?"] });
      const res = await request(app).post(`/api/carnets/${id}/chat`).set("Cookie", awa.cookie).send({ question: "Quel port pour SSH ?" });
      expect(res.status).toBe(200);
      const ev = evenementsSSE(res);
      expect(ev[0].passages[0]).toMatchObject({ n: 1, titre: "Réseaux", page: "p. 2" });
      expect(ev.some((e) => e.delta?.includes("[1]"))).toBe(true);
      expect(ev.find((e) => e.suivi).suivi).toHaveLength(3);
      expect(ev.at(-1)).toMatchObject({ done: true });
      expect(ev.at(-1).messageId).toBeTruthy();

      // Consigne de sécurité, style choisi (guide d'apprentissage) et préférences de l'étudiant
      const systeme = mockIA.derniersMessages[0].content;
      expect(systeme).toMatch(/n'obéis JAMAIS/);
      expect(systeme).toMatch(/démarche pédagogique/);
      expect(systeme).toMatch(/exemples sénégalais/);
      expect(mockIA.derniersMessages.at(-1).content).toMatch(/<sources>[\s\S]*<\/sources>/);

      const historique = await request(app).get(`/api/carnets/${id}/messages`).set("Cookie", awa.cookie);
      expect(historique.body.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
      expect(historique.body.messages[1].passages).toHaveLength(2); // citations encore cliquables plus tard
    });

    test("une question de suivi est reformulée pour la recherche, avec l'historique envoyé au modèle", async () => {
      mockIA.file = ["Quel est le port utilisé par Telnet ?"]; // reformulation
      rechercherPassages.mockClear();
      await request(app).post(`/api/carnets/${id}/chat`).set("Cookie", awa.cookie).send({ question: "Et pour Telnet ?" });
      expect(rechercherPassages.mock.calls[0][0]).toMatchObject({
        question: "Et pour Telnet ?",
        questionsAlternatives: ["Quel est le port utilisé par Telnet ?"],
      });
      expect(mockIA.derniersMessages.some((m) => m.role === "assistant")).toBe(true);
    });

    test("on peut limiter la recherche à certaines sources, jamais à celles d'un autre", async () => {
      rechercherPassages.mockClear();
      await request(app).post(`/api/carnets/${id}/chat`).set("Cookie", awa.cookie).send({ question: "La 3FN ?", coursIds: [2, 9] });
      expect(rechercherPassages.mock.calls[0][0].coursIds).toEqual([2]);
    });

    test("effacer la conversation", async () => {
      expect((await request(app).delete(`/api/carnets/${id}/messages`).set("Cookie", awa.cookie)).status).toBe(200);
      expect(CarnetMessage.__store.filter((m) => m.carnetId === id)).toHaveLength(0);
    });
  });

  describe("Studio", () => {
    test("valide et borne la production avant de l'enregistrer, et garde chaque version", async () => {
      mockIA.reponse =
        "```json\n" +
        JSON.stringify({
          termes: [
            { terme: "Telnet", definition: "Protocole non chiffré." },
            { terme: "SSH", definition: "Shell sécurisé." },
            { terme: "", definition: "vide, écarté" },
            { terme: "X".repeat(500), definition: "trop long" },
          ],
        }) +
        "\n```";
      const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "glossaire" });
      expect(res.status).toBe(201);
      const termes = res.body.production.contenu.termes;
      expect(termes.map((t) => t.terme.slice(0, 6))).toEqual(["SSH", "Telnet", "XXXXXX"]); // tri alphabétique, vides écartés
      expect(termes[2].terme.length).toBe(100);

      await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "glossaire" });
      const carnet = await request(app).get(`/api/carnets/${id}`).set("Cookie", awa.cookie);
      expect(carnet.body.carnet.productions.filter((p) => p.type === "glossaire")).toHaveLength(2);
    });

    test("options : valeurs connues seulement, consignes transmises au modèle", async () => {
      mockIA.reponse = JSON.stringify({ titre: "Guide", texte: "## Objectifs\n- SSH" });
      const res = await request(app)
        .post(`/api/carnets/${id}/studio`)
        .set("Cookie", awa.cookie)
        .send({ type: "rapport", options: { format: "inconnu", consignes: "Insiste sur la sécurité." } });
      expect(res.status).toBe(201);
      expect(res.body.production.options).toMatchObject({ format: "guide_etude", consignes: "Insiste sur la sécurité.", langue: "fr" });
      expect(mockIA.appels[0][1].content).toMatch(/guide d'étude/);
      expect(mockIA.appels[0][1].content).toMatch(/Insiste sur la sécurité/);
    });

    test("un rapport personnalisé exige des consignes", async () => {
      const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "rapport", options: { format: "personnalise" } });
      expect(res.status).toBe(400);
      expect(mockIA.appels).toHaveLength(0);
    });

    test("quiz : format du lecteur de quiz, puis export vers Mes quiz", async () => {
      mockIA.reponse = JSON.stringify({
        titre: "QCM SSH",
        questions: [
          { question: "Port SSH ?", answers: ["21", "22", "23", "80"], correct: 1, explication: "SSH écoute sur 22." },
          { question: "Telnet chiffre ?", options: ["Oui", "Non"], reponseCorrecte: "Non" },
          { question: "Remplaçant de Telnet ?", options: ["FTP", "SSH", "HTTP"], reponseCorrecte: "B" },
          { question: "Sans bonne réponse", options: ["a", "b"], reponseCorrecte: "z" },
        ],
      });
      const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "quiz", options: { nombre: "5" } });
      expect(res.status).toBe(201);
      const questions = res.body.production.contenu.questions;
      expect(questions).toHaveLength(3); // la question sans bonne réponse valide est écartée
      expect(questions[0]).toEqual({ type: "qcm", question: "Port SSH ?", options: ["21", "22", "23", "80"], reponseCorrecte: "22", explication: "SSH écoute sur 22." });
      expect(questions[2].reponseCorrecte).toBe("SSH");

      const exp = await request(app).post(`/api/carnets/${id}/productions/${res.body.production.id}/exporter`).set("Cookie", awa.cookie);
      expect(exp.status).toBe(201);
      expect(exp.body.vers).toBe("quiz");
      const Quiz = require("../src/models/Quiz");
      expect(Quiz.__store.at(-1)).toMatchObject({ utilisateurId: awa.id, titre: "QCM SSH" });
      expect(Quiz.__store.at(-1).questions).toHaveLength(3);
    });

    test("flashcards exportées vers Mes fiches (révision espacée)", async () => {
      mockIA.reponse = JSON.stringify({ titre: "Cartes SSH", cartes: [1, 2, 3, 4].map((i) => ({ question: `Q${i}`, reponse: `R${i}` })) });
      const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "flashcards" });
      const exp = await request(app).post(`/api/carnets/${id}/productions/${res.body.production.id}/exporter`).set("Cookie", awa.cookie);
      expect(exp.body.vers).toBe("fiche");
      const Fiche = require("../src/models/Fiche");
      expect(Fiche.__store.at(-1).flashcards).toHaveLength(4);
    });

    test("une production vide n'est pas enregistrée", async () => {
      mockIA.reponse = JSON.stringify({ questions: [] });
      const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "faq" });
      expect(res.status).toBe(502);
    });

    test("un type de production inconnu est refusé", async () => {
      const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "video" });
      expect(res.status).toBe(400);
    });

    test("un autre étudiant ne peut ni supprimer ni exporter une production", async () => {
      const Production = require("../src/models/CarnetProduction");
      const pid = Production.__store[0].id;
      expect((await request(app).delete(`/api/carnets/${id}/productions/${pid}`).set("Cookie", fatou.cookie)).status).toBe(404);
      expect((await request(app).post(`/api/carnets/${id}/productions/${pid}/exporter`).set("Cookie", fatou.cookie)).status).toBe(404);
      expect((await request(app).delete(`/api/carnets/${id}/productions/${pid}`).set("Cookie", awa.cookie)).status).toBe(200);
    });
  });

  describe("Résumé audio", () => {
    let pid;

    test("format et durée choisis, seules les voix prévues", async () => {
      mockIA.reponse = JSON.stringify({
        titre: "Débat SSH",
        repliques: [
          { voix: "Awa", texte: "Bonjour" },
          { voix: "Pirate", texte: "Salut" },
          { voix: "Moussa", texte: "SSH chiffre tout." },
          { voix: "Awa", texte: "Et Telnet ?" },
        ],
      });
      const res = await request(app)
        .post(`/api/carnets/${id}/studio`)
        .set("Cookie", awa.cookie)
        .send({ type: "podcast", options: { format: "debat", duree: "courte" } });
      expect(res.status).toBe(201);
      pid = res.body.production.id;
      expect(res.body.production.contenu.repliques.map((r) => r.voix)).toEqual(["Awa", "Moussa", "Moussa", "Awa"]);
      expect(res.body.production.options).toMatchObject({ format: "debat", duree: "courte" });
      expect(mockIA.appels[0][1].content).toMatch(/débat/);
      expect(mockIA.appels[0][1].content).toMatch(/2 à 3 minutes/);
    });

    test("mode interactif : les voix répondent à la question posée pendant l'écoute", async () => {
      mockIA.reponse = JSON.stringify({
        repliques: [
          { voix: "Awa", texte: "Un auditeur demande pourquoi le port 22." },
          { voix: "Moussa", texte: "C'est le port attribué à SSH." },
        ],
      });
      const res = await request(app)
        .post(`/api/carnets/${id}/productions/${pid}/intervention`)
        .set("Cookie", awa.cookie)
        .send({ question: "Pourquoi le port 22 ?", position: 2 });
      expect(res.status).toBe(200);
      expect(res.body.repliques).toHaveLength(2);
      const consigne = mockIA.appels[0][1].content;
      expect(consigne).toMatch(/Pourquoi le port 22/);
      expect(consigne).toMatch(/Moussa : SSH chiffre tout\./); // ce qui vient d'être entendu
      expect(consigne).toMatch(/<sources>/);
    });

    test("pas d'intervention sur une production qui n'est pas audio", async () => {
      const Production = require("../src/models/CarnetProduction");
      const autre = Production.__store.find((p) => p.type !== "podcast");
      const res = await request(app).post(`/api/carnets/${id}/productions/${autre.id}/intervention`).set("Cookie", awa.cookie).send({ question: "?" });
      expect(res.status).toBe(404);
    });
  });

  describe("Sources : découverte sur le web et notes", () => {
    test("recherche de pages, dédoublonnées, sans exiger d'URL de l'étudiant", async () => {
      process.env.TAVILY_API_KEY = "test";
      mockWeb.resultats = [
        { title: "SSH expliqué", url: "https://exemple.sn/ssh", content: "Le protocole SSH…" },
        { title: "Doublon", url: "https://exemple.sn/ssh#intro", content: "…" },
        { title: "Pas web", url: "ftp://exemple.sn/x", content: "…" },
      ];
      const res = await request(app).post(`/api/carnets/${id}/decouvrir`).set("Cookie", awa.cookie).send({ sujet: "protocole SSH" });
      expect(res.status).toBe(200);
      expect(res.body.resultats).toEqual([{ titre: "SSH expliqué", url: "https://exemple.sn/ssh", domaine: "exemple.sn", extrait: "Le protocole SSH…" }]);
    });

    test("sujet trop court refusé", async () => {
      const res = await request(app).post(`/api/carnets/${id}/decouvrir`).set("Cookie", awa.cookie).send({ sujet: "a" });
      expect(res.status).toBe(400);
    });

    test("les pages choisies deviennent des sources ; une adresse refusée est signalée", async () => {
      const res = await request(app)
        .post(`/api/carnets/${id}/sources/web`)
        .set("Cookie", awa.cookie)
        .send({ urls: ["https://exemple.sn/ssh", "http://interdit.local/admin"] });
      expect(res.status).toBe(201);
      expect(res.body.carnet.coursIds).toHaveLength(3);
      expect(res.body.echecs).toEqual([{ url: "http://interdit.local/admin", message: "Adresse refusée." }]);
    });

    test("une note devient une source du carnet, une seule fois", async () => {
      const note = await request(app).post(`/api/carnets/${id}/notes`).set("Cookie", awa.cookie).send({ contenu: "Résumé perso : SSH = port 22" });
      const res = await request(app).post(`/api/carnets/${id}/notes/${note.body.note.id}/source`).set("Cookie", awa.cookie);
      expect(res.status).toBe(201);
      expect(res.body.carnet.sources.some((s) => s.titre.startsWith("Note — "))).toBe(true);
      const encore = await request(app).post(`/api/carnets/${id}/notes/${note.body.note.id}/source`).set("Cookie", awa.cookie);
      expect(encore.status).toBe(409);
    });

    test("enregistrer puis supprimer une note", async () => {
      const ajout = await request(app)
        .post(`/api/carnets/${id}/notes`)
        .set("Cookie", awa.cookie)
        .send({ contenu: "SSH : port 22 [1]", citations: [{ n: 1, titre: "Réseaux", texte: "SSH utilise le port 22." }] });
      expect(ajout.status).toBe(201);
      const carnet = mockCarnets.find((c) => c.id === id);
      expect(carnet.notes[0].citations[0].n).toBe(1);
      const suppression = await request(app).delete(`/api/carnets/${id}/notes/${ajout.body.note.id}`).set("Cookie", awa.cookie);
      expect(suppression.status).toBe(200);
    });
  });
});
