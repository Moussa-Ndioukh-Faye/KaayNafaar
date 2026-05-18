const mockQuiz = [];

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

jest.mock("../src/models/Quiz", () => {
  const M = function (d) {
    Object.assign(this, d || {});
    if (!this.questions) this.questions = [];
    if (!this.sessions) this.sessions = [];
  };
  M.findOne = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const found = mockQuiz.find((q) =>
      Object.entries(where).every(([k, v]) => {
        if (k === "Op.or") return true;
        return String(q[k]) === String(v);
      })
    );
    return found ? Object.assign(new M(), found) : null;
  });
  M.findAll = jest.fn(async (opts) => {
    const where = opts?.where || {};
    return mockQuiz
      .filter((q) => Object.entries(where).every(([k, v]) => String(q[k]) === String(v)))
      .map((q) => Object.assign(new M(), q));
  });
  M.create = jest.fn(async (data) => {
    const entry = { id: mockQuiz.length + 1, ...data };
    mockQuiz.push(entry);
    return Object.assign(new M(), entry);
  });
  M.destroy = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const idx = mockQuiz.findIndex((q) =>
      Object.entries(where).every(([k, v]) => String(q[k]) === String(v))
    );
    if (idx === -1) return 0;
    mockQuiz.splice(idx, 1);
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
  mockQuiz.length = 0;
});

describe("API Quiz", () => {
  test("GET /api/quiz sans auth retourne 401", async () => {
    const res = await request(app).get("/api/quiz");
    expect(res.status).toBe(401);
  });

  test("GET /api/quiz retourne liste vide", async () => {
    const res = await request(app)
      .get("/api/quiz")
      .set("Cookie", authCookie());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quizList).toEqual([]);
  });

  test("POST /api/quiz cree un quiz", async () => {
    const questions = [
      { question: "Quelle est la capitale de la France ?", reponses: ["Paris", "Londres", "Berlin"], reponseCorrecte: "Paris" },
    ];
    const res = await request(app)
      .post("/api/quiz")
      .set("Cookie", authCookie())
      .send({ titre: "Mon Quiz", matiere: "Géo", questions, difficulte: "facile" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.quiz.titre).toBe("Mon Quiz");
  });

  test("GET /api/quiz/:id retourne un quiz", async () => {
    const createRes = await request(app)
      .post("/api/quiz")
      .set("Cookie", authCookie())
      .send({ titre: "Quiz Test", matiere: "Info", questions: [{ question: "Q", reponses: ["A"], reponseCorrecte: "A" }] });

    const res = await request(app)
      .get(`/api/quiz/${createRes.body.quiz.id}`)
      .set("Cookie", authCookie());
    expect(res.status).toBe(200);
    expect(res.body.quiz.titre).toBe("Quiz Test");
  });

  test("GET /api/quiz/:id inexistant retourne 404", async () => {
    const res = await request(app)
      .get("/api/quiz/999")
      .set("Cookie", authCookie());
    expect(res.status).toBe(404);
  });

  test("POST /api/quiz/:id/session soumet une session", async () => {
    const questions = [
      { question: "Q1", reponses: ["A", "B", "C"], reponseCorrecte: "A" },
    ];
    const createRes = await request(app)
      .post("/api/quiz")
      .set("Cookie", authCookie())
      .send({ titre: "Quiz Session", matiere: "M", questions });

    const res = await request(app)
      .post(`/api/quiz/${createRes.body.quiz.id}/session`)
      .set("Cookie", authCookie())
      .send({
        reponses: [{ reponseUtilisateur: "B" }],
        tempsPasse: 30,
      });
    expect(res.status).toBe(200);
    expect(res.body.resultat.score).toBe(0);
    expect(res.body.resultat.total).toBe(1);
  });

  test("POST /api/quiz/:id/session avec mauvais nombre de reponses retourne 400", async () => {
    const questions = [
      { question: "Q1", reponses: ["A", "B"], reponseCorrecte: "A" },
    ];
    const createRes = await request(app)
      .post("/api/quiz")
      .set("Cookie", authCookie())
      .send({ titre: "Quiz Bad", matiere: "M", questions });

    const res = await request(app)
      .post(`/api/quiz/${createRes.body.quiz.id}/session`)
      .set("Cookie", authCookie())
      .send({
        reponses: [{ reponseUtilisateur: "A" }, { reponseUtilisateur: "B" }],
        tempsPasse: 10,
      });
    expect(res.status).toBe(400);
  });

  test("DELETE /api/quiz/:id supprime un quiz", async () => {
    const createRes = await request(app)
      .post("/api/quiz")
      .set("Cookie", authCookie())
      .send({ titre: "À supprimer", matiere: "M", questions: [{ question: "Q", reponses: ["A"], reponseCorrecte: "A" }] });

    const delRes = await request(app)
      .delete(`/api/quiz/${createRes.body.quiz.id}`)
      .set("Cookie", authCookie());
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const getRes = await request(app)
      .get(`/api/quiz/${createRes.body.quiz.id}`)
      .set("Cookie", authCookie());
    expect(getRes.status).toBe(404);
  });

  test("DELETE /api/quiz/:id inexistant retourne 404", async () => {
    const res = await request(app)
      .delete("/api/quiz/999")
      .set("Cookie", authCookie());
    expect(res.status).toBe(404);
  });
});
