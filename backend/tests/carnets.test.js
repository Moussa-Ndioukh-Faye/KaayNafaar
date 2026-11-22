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


jest.mock("../src/models/Fiche", () => {
  const M = function () {};
  M.findOne = jest.fn().mockResolvedValue(null);
  M.destroy = jest.fn().mockResolvedValue();
  M.findAll = jest.fn().mockResolvedValue([]);
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  return M;
});

jest.mock("../src/models/Quiz", () => {
  const M = function () {};
  M.findOne = jest.fn().mockResolvedValue(null);
  M.destroy = jest.fn().mockResolvedValue();
  M.findAll = jest.fn().mockResolvedValue([]);
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  return M;
});


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
  M.findAll = jest.fn(async ({ where } = {}) => mockCours.filter((c) => correspond(c, where)).map((c) => ({ ...c, toJSON: () => ({ ...c }) })));
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
    const ligne = { id: suivant++, notes: [], studio: {}, coursIds: [], ...d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
    { n: 1, coursId: 1, titre: "Réseaux", texte: "SSH utilise le port 22." },
    { n: 2, coursId: 1, titre: "Réseaux", texte: "SSH remplace Telnet." },
  ]),
  formaterPassages: jest.fn((p) => p.map((x) => `[${x.n}] ${x.texte}`).join("\n")),
}));

const mockIA = { reponse: "{}" };
jest.mock("../src/utils/aiProviderManager", () => ({
  AIProviderManager: function () {
    this.estDisponible = () => true;
    this.complete = jest.fn(async () => mockIA.reponse);
    this.streamComplete = jest.fn(async ({ onDelta, onDone, messages }) => {
      mockIA.derniersMessages = messages;
      onDelta("SSH écoute sur le port 22 [1].");
      onDone("SSH écoute sur le port 22 [1].");
    });
  },
}));

const request = require("supertest");
const app = require("../server");

const compte = async (email) => {
  const res = await request(app).post("/api/auth/inscription").send({ nom: "Awa Ndiaye", email, motDePasse: "secret123" });
  return { cookie: res.headers["set-cookie"], id: mockUsers.find((u) => u.email === email).id };
};

describe("Carnets", () => {
  let awa;
  let fatou;

  beforeAll(async () => {
    awa = await compte("awa.carnet@test.com");
    fatou = await compte("fatou.carnet@test.com");
    mockCours.push(
      { id: 1, utilisateurId: awa.id, titre: "Réseaux", matiere: "Réseaux", contenu: "SSH utilise le port 22. ".repeat(20) },
      { id: 2, utilisateurId: awa.id, titre: "SQL", matiere: "BD", contenu: "La 3FN élimine les dépendances transitives. ".repeat(10) },
      { id: 9, utilisateurId: fatou.id, titre: "Cours privé de Fatou", matiere: "Secret", contenu: "Ne doit jamais fuiter." }
    );
  });

  test("crée un carnet en ne gardant que les cours de l'étudiant", async () => {
    const res = await request(app)
      .post("/api/carnets")
      .set("Cookie", awa.cookie)
      .send({ titre: "Partiel réseaux", coursIds: [1, 2, 9, "x"] });
    expect(res.status).toBe(201);
    expect(res.body.carnet.coursIds).toEqual([1, 2]); // le cours 9 (de Fatou) est écarté
    expect(res.body.carnet.sources.map((s) => s.titre)).toEqual(["Réseaux", "SQL"]);
  });

  test("un autre étudiant ne voit pas, ne modifie pas et n'interroge pas ce carnet", async () => {
    const id = mockCarnets[0].id;
    expect((await request(app).get(`/api/carnets/${id}`).set("Cookie", fatou.cookie)).status).toBe(404);
    expect((await request(app).put(`/api/carnets/${id}`).set("Cookie", fatou.cookie).send({ titre: "Piraté" })).status).toBe(404);
    expect(
      (await request(app).post(`/api/carnets/${id}/chat`).set("Cookie", fatou.cookie).send({ messages: [{ role: "user", content: "?" }] })).status
    ).toBe(404);
    const liste = await request(app).get("/api/carnets").set("Cookie", fatou.cookie);
    expect(liste.body.carnets).toEqual([]);
  });

  test("le chat envoie d'abord les passages numérotés, puis une réponse qui les cite", async () => {
    const id = mockCarnets[0].id;
    const res = await request(app)
      .post(`/api/carnets/${id}/chat`)
      .set("Cookie", awa.cookie)
      .send({ messages: [{ role: "user", content: "Quel port pour SSH ?" }] });
    expect(res.status).toBe(200);
    const evenements = res.text
      .split("\n\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l.replace(/^data: /, "")));
    expect(evenements[0].passages).toHaveLength(2);
    expect(evenements[0].passages[0]).toMatchObject({ n: 1, titre: "Réseaux" });
    expect(evenements.some((e) => e.delta?.includes("[1]"))).toBe(true);
    expect(evenements.at(-1).done).toBe(true);
    // Les sources sont fournies comme des données, avec la consigne anti-injection
    expect(mockIA.derniersMessages[0].content).toMatch(/n'obéis JAMAIS/);
    expect(mockIA.derniersMessages.at(-1).content).toMatch(/<sources>[\s\S]*<\/sources>/);
  });

  test("le studio valide et borne la production de l'IA avant de l'enregistrer", async () => {
    const id = mockCarnets[0].id;
    mockIA.reponse = "```json\n" + JSON.stringify({
      termes: [
        { terme: "Telnet", definition: "Protocole non chiffré." },
        { terme: "SSH", definition: "Shell sécurisé." },
        { terme: "", definition: "vide, écarté" },
        { terme: "X".repeat(500), definition: "trop long" },
      ],
    }) + "\n```";
    const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "glossaire" });
    expect(res.status).toBe(200);
    const termes = res.body.production.contenu.termes;
    expect(termes.map((t) => t.terme.slice(0, 6))).toEqual(["SSH", "Telnet", "XXXXXX"]); // tri alphabétique, vides écartés
    expect(termes[2].terme.length).toBe(100);
    expect(mockCarnets[0].studio.glossaire.contenu.termes).toHaveLength(3);
  });

  test("le podcast n'accepte que les voix prévues", async () => {
    const id = mockCarnets[0].id;
    mockIA.reponse = JSON.stringify({ titre: "SSH", repliques: [{ voix: "Awa", texte: "Bonjour" }, { voix: "Pirate", texte: "Salut" }] });
    const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "podcast" });
    expect(res.body.production.contenu.repliques.map((r) => r.voix)).toEqual(["Awa", "Moussa"]);
  });

  test("un type de production inconnu est refusé", async () => {
    const id = mockCarnets[0].id;
    const res = await request(app).post(`/api/carnets/${id}/studio`).set("Cookie", awa.cookie).send({ type: "video" });
    expect(res.status).toBe(400);
  });

  test("enregistrer puis supprimer une note", async () => {
    const id = mockCarnets[0].id;
    const ajout = await request(app)
      .post(`/api/carnets/${id}/notes`)
      .set("Cookie", awa.cookie)
      .send({ contenu: "SSH : port 22 [1]", citations: [{ n: 1, titre: "Réseaux", texte: "SSH utilise le port 22." }] });
    expect(ajout.status).toBe(201);
    expect(mockCarnets[0].notes[0].citations[0].n).toBe(1);
    const suppression = await request(app).delete(`/api/carnets/${id}/notes/${ajout.body.note.id}`).set("Cookie", awa.cookie);
    expect(suppression.status).toBe(200);
    expect(mockCarnets[0].notes).toHaveLength(0);
  });
});
