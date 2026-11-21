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
  M.destroy = jest.fn().mockResolvedValue();
  M.findAll = jest.fn().mockResolvedValue([]);
  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  return M;
});

jest.mock("../src/models/Quiz", () => {
  const M = function () {};
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
    const token = inscription.body.token;

    const avant = await request(app).get("/api/auth/profil").set("Authorization", `Bearer ${token}`);
    expect(avant.status).toBe(200);

    // Simule un changement de mot de passe depuis une autre session
    const bcrypt = require("bcryptjs");
    mockUsers[0].motDePasse = await bcrypt.hash("nouveauSecret456", 4);

    const apres = await request(app).get("/api/auth/profil").set("Authorization", `Bearer ${token}`);
    expect(apres.status).toBe(401);
  });

  test("export des données personnelles (portabilité)", async () => {
    const inscription = await request(app)
      .post("/api/auth/inscription")
      .send({ nom: "Test", email: "export@test.com", motDePasse: "secret123" });

    const res = await request(app)
      .get("/api/auth/export")
      .set("Authorization", `Bearer ${inscription.body.token}`);
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
