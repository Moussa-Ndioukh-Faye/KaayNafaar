const mockFiches = [];

jest.mock("../src/utils/aiPro", () => ({
  indexerCours: jest.fn(() => Promise.resolve()),
}));

jest.mock("../src/config/database", () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    define: jest.fn(() => ({ belongsTo: jest.fn(), hasMany: jest.fn() })),
  },
  connectDB: jest.fn().mockResolvedValue(),
}));

jest.mock("../src/models/User", () => {
  const M = function (d) { Object.assign(this, d || {}); };
  M.findOne = jest.fn();
  M.findByPk = jest.fn(async (id) => {
    const entry = { id, nom: "Test", email: "test@test.com", niveauEtude: "licence" };
    return Object.assign(new M(), entry);
  });
  M.create = jest.fn();
  M.destroy = jest.fn();
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  M.hasOne = jest.fn();
  M.prototype.verifierMotDePasse = jest.fn();
  M.prototype.save = jest.fn();
  return M;
});

jest.mock("../src/models/Course", () => {
  const M = function (d) { Object.assign(this, d || {}); };
  M.findOne = jest.fn();
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  M.prototype.save = jest.fn();
  M.prototype.toJSON = function () { return { ...this }; };
  return M;
});

jest.mock("../src/models/Fiche", () => {
  const M = function (d) {
    Object.assign(this, d || {});
    if (!this.conceptsCles) this.conceptsCles = [];
    if (!this.explications) this.explications = {};
    if (!this.pointsImportants) this.pointsImportants = [];
    if (!this.flashcards) this.flashcards = [];
  };
  M.findByPk = jest.fn(async (id) => {
    const found = mockFiches.find((f) => String(f.id) === String(id));
    return found ? Object.assign(new M(), found) : null;
  });
  M.findOne = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const found = mockFiches.find((f) =>
      Object.entries(where).every(([k, v]) => String(f[k]) === String(v))
    );
    return found ? Object.assign(new M(), found) : null;
  });
  M.findAll = jest.fn(async (opts) => {
    const where = opts?.where || {};
    return mockFiches
      .filter((f) => Object.entries(where).every(([k, v]) => String(f[k]) === String(v)))
      .map((f) => Object.assign(new M(), f));
  });
  M.create = jest.fn(async (data) => {
    const entry = { id: mockFiches.length + 1, ...data };
    mockFiches.push(entry);
    return Object.assign(new M(), entry);
  });
  M.destroy = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const idx = mockFiches.findIndex((f) =>
      Object.entries(where).every(([k, v]) => String(f[k]) === String(v))
    );
    if (idx === -1) return 0;
    mockFiches.splice(idx, 1);
    return 1;
  });
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  M.prototype.save = jest.fn(async function () { return this; });
  M.prototype.update = jest.fn(async function (d) { Object.assign(this, d); return this; });
  M.prototype.toJSON = function () { return { ...this }; };
  return M;
});

jest.mock("../src/models/Progression", () => {
  const M = function (d) { Object.assign(this, d || {}); };
  M.findOne = jest.fn(async () => null);
  M.belongsTo = jest.fn();
  return M;
});

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");

jest.setTimeout(10000);

const makeToken = (uid = 1) =>
  jwt.sign({ id: uid }, process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars!!", { expiresIn: "1h" });
const authCookie = (uid = 1) => `token=${makeToken(uid)}`;

beforeEach(() => {
  mockFiches.length = 0;
});

describe("API Fiches", () => {
  test("GET /api/fiches sans auth retourne 401", async () => {
    const res = await request(app).get("/api/fiches");
    expect(res.status).toBe(401);
  });

  test("GET /api/fiches retourne liste vide", async () => {
    const res = await request(app)
      .get("/api/fiches")
      .set("Cookie", authCookie());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fiches).toEqual([]);
  });

  test("POST /api/fiches cree une fiche", async () => {
    const res = await request(app)
      .post("/api/fiches")
      .set("Cookie", authCookie())
      .send({ titre: "Ma Fiche", matiere: "Maths", resume: "Résumé" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.fiche.titre).toBe("Ma Fiche");
  });

  test("GET /api/fiches/:id retourne une fiche", async () => {
    const createRes = await request(app)
      .post("/api/fiches")
      .set("Cookie", authCookie())
      .send({ titre: "Fiche Test", matiere: "Info", resume: "..." });

    const res = await request(app)
      .get(`/api/fiches/${createRes.body.fiche.id}`)
      .set("Cookie", authCookie());
    expect(res.status).toBe(200);
    expect(res.body.fiche.titre).toBe("Fiche Test");
  });

  test("GET /api/fiches/:id inexistant retourne 404", async () => {
    const res = await request(app)
      .get("/api/fiches/999")
      .set("Cookie", authCookie());
    expect(res.status).toBe(404);
  });

  test("PUT /api/fiches/:id modifie une fiche", async () => {
    const createRes = await request(app)
      .post("/api/fiches")
      .set("Cookie", authCookie())
      .send({ titre: "Avant", matiere: "M", resume: "c" });

    const res = await request(app)
      .put(`/api/fiches/${createRes.body.fiche.id}`)
      .set("Cookie", authCookie())
      .send({ titre: "Après" });
    expect(res.status).toBe(200);
    expect(res.body.fiche.titre).toBe("Après");
  });

  test("PUT /api/fiches/:id inexistant retourne 404", async () => {
    const res = await request(app)
      .put("/api/fiches/999")
      .set("Cookie", authCookie())
      .send({ titre: "N'importe" });
    expect(res.status).toBe(404);
  });

  test("DELETE /api/fiches/:id supprime une fiche", async () => {
    const createRes = await request(app)
      .post("/api/fiches")
      .set("Cookie", authCookie())
      .send({ titre: "À supprimer", matiere: "M", resume: "c" });

    const delRes = await request(app)
      .delete(`/api/fiches/${createRes.body.fiche.id}`)
      .set("Cookie", authCookie());
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await request(app)
      .get(`/api/fiches/${createRes.body.fiche.id}`)
      .set("Cookie", authCookie());
    expect(getRes.status).toBe(404);
  });

  test("DELETE /api/fiches/:id inexistant retourne 404", async () => {
    const res = await request(app)
      .delete("/api/fiches/999")
      .set("Cookie", authCookie());
    expect(res.status).toBe(404);
  });

  test("PUT /api/fiches/:id/flashcard/:flashcardId met à jour une flashcard", async () => {
    const flashcards = [
      { question: "Q1", reponse: "R1", niveauMaitrise: 0 },
    ];
    const createRes = await request(app)
      .post("/api/fiches")
      .set("Cookie", authCookie())
      .send({ titre: "Flash", matiere: "M", flashcards });

    const res = await request(app)
      .put(`/api/fiches/${createRes.body.fiche.id}/flashcard/0`)
      .set("Cookie", authCookie())
      .send({ niveauMaitrise: 3 });
    expect(res.status).toBe(200);
    expect(res.body.flashcard.niveauMaitrise).toBe(3);
  });

  test("PUT /api/fiches/:id/flashcard/:flashcardId niveau invalide retourne 400", async () => {
    const createRes = await request(app)
      .post("/api/fiches")
      .set("Cookie", authCookie())
      .send({ titre: "Flash", matiere: "M", flashcards: [{ question: "Q", reponse: "R" }] });

    const res = await request(app)
      .put(`/api/fiches/${createRes.body.fiche.id}/flashcard/0`)
      .set("Cookie", authCookie())
      .send({ niveauMaitrise: 99 });
    expect(res.status).toBe(400);
  });
});
