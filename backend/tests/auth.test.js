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

jest.mock("../src/models/Course", () => {
  const M = function () {};
  M.destroy = jest.fn().mockResolvedValue();
  M.findAll = jest.fn().mockResolvedValue([]);
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
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

const request = require("supertest");
const app = require("../server");

jest.setTimeout(10000);

beforeEach(() => {
  mockUsers.length = 0;
  jest.clearAllMocks();
});

afterAll(async () => {
  const { sequelize } = require("../src/config/database");
  const { redis } = require("../src/config/redis");
  if (redis && redis.quit) await redis.quit();
  if (sequelize && sequelize.close) await sequelize.close();
});

describe("API Auth", () => {
  test("profil protégé requiert authentification", async () => {
    const res = await request(app).get("/api/auth/profil");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test("inscription valide retourne 201 et cookie", async () => {
    const res = await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Testeur", email: "test@example.com", motDePasse: "secret123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.utilisateur).toBeDefined();
    expect(res.body.utilisateur.email).toBe("test@example.com");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("inscription email invalide retourne 400", async () => {
    const res = await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Test", email: "pas-email", motDePasse: "123456" });
    expect(res.status).toBe(400);
  });

  test("inscription sans champs requis retourne 400", async () => {
    const res = await request(app)
      .post("/api/auth/inscription")
      .send({ email: "test@test.com" });
    expect(res.status).toBe(400);
  });

  test("connexion valide retourne 200 et cookie", async () => {
    await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Test", email: "test@test.com", motDePasse: "secret123" });

    const res = await request(app)
      .post("/api/auth/connexion")
      .send({ email: "test@test.com", motDePasse: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  test("connexion avec mauvais mot de passe retourne 401", async () => {
    await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Test", email: "test2@test.com", motDePasse: "secret123" });

    const res = await request(app)
      .post("/api/auth/connexion")
      .send({ email: "test2@test.com", motDePasse: "wrong" });
    expect(res.status).toBe(401);
  });

  test("mot de passe de moins de 8 caractères refusé (NIST 800-63B)", async () => {
    const res = await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Test", email: "court@test.com", motDePasse: "abc1234" });
    expect(res.status).toBe(400);
  });

  test("le jeton est révoqué quand le mot de passe change", async () => {
    const inscription = await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Test", email: "revoc@test.com", motDePasse: "secret123" });
    // Le jeton de session n'est jamais renvoyé dans le JSON : seulement en cookie httpOnly
    expect(inscription.body.token).toBeUndefined();
    const cookie = inscription.headers["set-cookie"];

    const avant = await request(app).get("/api/auth/profil").set("Cookie", cookie);
    expect(avant.status).toBe(200);

    // Simule un changement de mot de passe depuis une autre session
    const bcrypt = require("bcryptjs");
    mockUsers[0].motDePasse = await bcrypt.hash("nouveauSecret456", 4);

    const apres = await request(app).get("/api/auth/profil").set("Cookie", cookie);
    expect(apres.status).toBe(401);
  });

  test("export des données personnelles (portabilité)", async () => {
    const inscription = await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Test", email: "export@test.com", motDePasse: "secret123" });

    const res = await request(app)
      .get("/api/auth/export")
      .set("Cookie", inscription.headers["set-cookie"]);
    expect(res.status).toBe(200);
    expect(res.body.format).toBe("kaay-nafaar-export-v1");
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
  });

  test("jeton signé avec un autre algorithme refusé", async () => {
    const jwt = require("jsonwebtoken");
    const faux = jwt.sign({ id: 1 }, "", { algorithm: "none" });
    const res = await request(app).get("/api/auth/profil").set("Authorization", `Bearer ${faux}`);
    expect(res.status).toBe(401);
  });
});

describe("Durcissement de la session", () => {
  const jwt = require("jsonwebtoken");
  const Quiz = require("../src/models/Quiz");
  const Fiche = require("../src/models/Fiche");

  const creerCompte = async (email) => {
    const res = await request(app).post("/api/auth/inscription").send({ nom: "Awa", email, motDePasse: "secret123" });
    return { cookie: res.headers["set-cookie"], id: mockUsers.find((u) => u.email === email).id };
  };

  test("le profil ne renvoie jamais le jeton de session au JavaScript", async () => {
    const { cookie } = await creerCompte("profil-jeton@test.com");
    const res = await request(app).get("/api/auth/profil").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/); // aucun JWT dans la réponse
  });

  test("le cookie de session est HttpOnly et SameSite=Lax", async () => {
    const res = await request(app).post("/api/auth/inscription").send({ nom: "Awa", email: "cookie@test.com", motDePasse: "secret123" });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  test("le jeton d'upload dure 5 minutes et ne sert qu'à importer un cours", async () => {
    const { cookie } = await creerCompte("upload@test.com");
    const res = await request(app).get("/api/auth/jeton-upload").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toMatch(/no-store/);

    const charge = jwt.decode(res.body.jeton);
    expect(charge.portee).toBe("upload");
    expect(charge.exp - charge.iat).toBe(300);

    // Refusé partout ailleurs, par exemple pour lire le profil
    const profil = await request(app).get("/api/auth/profil").set("Authorization", `Bearer ${res.body.jeton}`);
    expect(profil.status).toBe(401);
  });

  test("un quiz public d'un autre étudiant ne montre ni ses scores ni son identifiant", async () => {
    const { cookie } = await creerCompte("curieux@test.com");
    Quiz.findOne.mockResolvedValueOnce({
      utilisateurId: 999,
      toJSON: () => ({ id: 5, titre: "Quiz public", utilisateurId: 999, sessions: [{ score: 3, reponses: ["secret"] }], questions: [] }),
    });
    const res = await request(app).get("/api/quiz/5").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.quiz.titre).toBe("Quiz public");
    expect(res.body.quiz.sessions).toBeUndefined();
    expect(res.body.quiz.utilisateurId).toBeUndefined();
  });

  test("une fiche publique d'un autre étudiant ne montre pas son historique de révision", async () => {
    const { cookie } = await creerCompte("lecteur@test.com");
    Fiche.findOne.mockResolvedValueOnce({
      utilisateurId: 999,
      toJSON: () => ({
        id: 8,
        titre: "Fiche publique",
        utilisateurId: 999,
        coursId: 4,
        cours: { titre: "Cours privé" },
        flashcards: [{ question: "Q ?", reponse: "R", nextReview: "2026-12-01", easiness: 2.5, repetitions: 3 }],
      }),
    });
    const res = await request(app).get("/api/fiches/8").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.fiche.utilisateurId).toBeUndefined();
    expect(res.body.fiche.cours).toBeUndefined();
    expect(res.body.fiche.flashcards).toEqual([{ question: "Q ?", reponse: "R" }]);
  });
});
