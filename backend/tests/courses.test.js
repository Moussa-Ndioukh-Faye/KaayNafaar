const mockCourses = [];
const mockProgressions = [];

jest.mock("../src/utils/aiPro", () => ({
  indexerCours: jest.fn(() => Promise.resolve()),
}));

jest.mock("../src/utils/ocr", () => ({
  extraireTexteImage: jest.fn(() => Promise.resolve("")),
}));

jest.mock("../src/utils/worker", () => ({
  extractionQueue: { add: jest.fn().mockResolvedValue({}) },
  worker: { close: jest.fn() },
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
  M.findByPk = jest.fn(async (id) => {
    const found = mockCourses.find((c) => String(c.id) === String(id));
    return found ? Object.assign(new M(), found) : null;
  });
  M.findOne = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const found = mockCourses.find((c) =>
      Object.entries(where).every(([k, v]) => String(c[k]) === String(v))
    );
    return found ? Object.assign(new M(), found) : null;
  });
  M.findAll = jest.fn(async (opts) => {
    const where = opts?.where || {};
    return mockCourses
      .filter((c) => Object.entries(where).every(([k, v]) => String(c[k]) === String(v)))
      .map((c) => Object.assign(new M(), c));
  });
  M.create = jest.fn(async (data) => {
    const entry = { id: mockCourses.length + 1, ...data };
    mockCourses.push(entry);
    return Object.assign(new M(), entry);
  });
  M.destroy = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const idx = mockCourses.findIndex((c) =>
      Object.entries(where).every(([k, v]) => String(c[k]) === String(v))
    );
    if (idx === -1) return 0;
    mockCourses.splice(idx, 1);
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
  M.findOne = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const found = mockProgressions.find((p) =>
      Object.entries(where).every(([k, v]) => p[k] === v)
    );
    return found ? Object.assign(new M(), found) : null;
  });
  M.create = jest.fn(async (data) => {
    const entry = { id: 1, stats: {}, ...data };
    mockProgressions.push(entry);
    return Object.assign(new M(), entry);
  });
  M.destroy = jest.fn();
  M.update = jest.fn();
  M.belongsTo = jest.fn();
  return M;
});

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../server");

jest.setTimeout(10000);

const makeToken = (uid = 1) =>
  jwt.sign({ id: uid, sid: "session-test" }, process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars!!", { expiresIn: "1h" });
const authCookie = (uid = 1) => `token=${makeToken(uid)}`;

beforeEach(() => {
  mockCourses.length = 0;
  mockProgressions.length = 0;
});

afterAll(async () => {
  const { sequelize } = require("../src/config/database");
  const { redis } = require("../src/config/redis");
  if (redis && redis.quit) await redis.quit();
  if (sequelize && sequelize.close) await sequelize.close();
});

describe("API Courses", () => {
  test("GET /api/courses sans auth retourne 401", async () => {
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(401);
  });

  test("GET /api/courses retourne liste vide", async () => {
    const res = await request(app)
      .get("/api/courses")
      .set("Cookie", authCookie());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cours).toEqual([]);
  });

  test("POST /api/courses cree un cours", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Cookie", authCookie())
      .send({ titre: "Test Course", matiere: "Maths", contenu: "Contenu test" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.cours.titre).toBe("Test Course");
  });

  test("POST /api/courses sans titre retourne 400", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Cookie", authCookie())
      .send({ matiere: "Maths" });
    expect(res.status).toBe(400);
  });

  test("GET /api/courses/:id retourne un cours", async () => {
    await request(app)
      .post("/api/courses")
      .set("Cookie", authCookie())
      .send({ titre: "Mon Cours", matiere: "Info", contenu: "..." });

    const res = await request(app)
      .get("/api/courses/1")
      .set("Cookie", authCookie());
    expect(res.status).toBe(200);
    expect(res.body.cours.titre).toBe("Mon Cours");
  });

  test("PUT /api/courses/:id modifie un cours", async () => {
    await request(app)
      .post("/api/courses")
      .set("Cookie", authCookie())
      .send({ titre: "Avant", matiere: "M", contenu: "c" });

    const res = await request(app)
      .put("/api/courses/1")
      .set("Cookie", authCookie())
      .send({ titre: "Après", matiere: "M" });
    expect(res.status).toBe(200);
    expect(res.body.cours.titre).toBe("Après");
  });

  test("DELETE /api/courses/:id supprime un cours", async () => {
    await request(app)
      .post("/api/courses")
      .set("Cookie", authCookie())
      .send({ titre: "À supprimer", matiere: "M", contenu: "c" });

    const res = await request(app)
      .delete("/api/courses/1")
      .set("Cookie", authCookie());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app)
      .get("/api/courses/1")
      .set("Cookie", authCookie());
    expect(getRes.status).toBe(404);
  });

  test("DELETE /api/courses/:id inexistant retourne 404", async () => {
    const res = await request(app)
      .delete("/api/courses/999")
      .set("Cookie", authCookie());
    expect(res.status).toBe(404);
  });
});
