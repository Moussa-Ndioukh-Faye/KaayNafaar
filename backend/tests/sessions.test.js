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

jest.mock("../src/models/Carnet", () => {
  const M = function () {};
  M.destroy = jest.fn().mockResolvedValue();
  M.findAll = jest.fn().mockResolvedValue([]);
  M.findOne = jest.fn().mockResolvedValue(null);
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
  await sequelize.close?.();
});

const jwt = require("jsonwebtoken");
const { decrireAppareil, tronquerIP } = require("../src/utils/sessions");

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const cookieDe = (res) => res.headers["set-cookie"][0].split(";")[0];

/** Crée le compte puis ouvre deux sessions : une sur iPhone, une sur Windows */
const deuxAppareils = async (email) => {
  await request(app).post("/api/auth/inscription").set("User-Agent", IPHONE).send({ nom: "Awa", email, motDePasse: "secret123" });
  const telephone = await request(app).post("/api/auth/connexion").set("User-Agent", IPHONE).send({ email, motDePasse: "secret123" });
  const ordinateur = await request(app).post("/api/auth/connexion").set("User-Agent", WINDOWS).send({ email, motDePasse: "secret123" });
  return { telephone: cookieDe(telephone), ordinateur: cookieDe(ordinateur) };
};

describe("Description des appareils (sans stocker le User-Agent)", () => {
  test("reconnaît le navigateur et le système", () => {
    expect(decrireAppareil(IPHONE)).toEqual({ appareil: "Safari sur iPhone", typeAppareil: "telephone" });
    expect(decrireAppareil(WINDOWS)).toEqual({ appareil: "Chrome sur Windows", typeAppareil: "ordinateur" });
    expect(decrireAppareil("").appareil).toBe("Navigateur sur un appareil inconnu");
  });

  test("tronque l'adresse IP", () => {
    expect(tronquerIP("41.82.15.203")).toBe("41.82.15.x");
    expect(tronquerIP("::ffff:196.207.1.9")).toBe("196.207.1.x");
    expect(tronquerIP("2001:db8:85a3:0:0:8a2e:370:7334")).toBe("2001:db8:85a3::x");
    expect(tronquerIP(undefined)).toBeNull();
  });
});

describe("Sessions et appareils connectés", () => {
  test("la liste montre chaque appareil, et lequel est celui en cours", async () => {
    const { telephone } = await deuxAppareils("liste@test.com");
    const res = await request(app).get("/api/auth/sessions").set("Cookie", telephone);
    expect(res.status).toBe(200);
    const noms = res.body.sessions.map((s) => s.appareil);
    expect(noms).toEqual(expect.arrayContaining(["Safari sur iPhone", "Chrome sur Windows"]));
    const actuelle = res.body.sessions.filter((s) => s.actuelle);
    expect(actuelle).toHaveLength(1);
    expect(actuelle[0].appareil).toBe("Safari sur iPhone");
    expect(JSON.stringify(res.body)).not.toMatch(/Mozilla/); // le User-Agent n'est jamais renvoyé
  });

  test("déconnecter un appareil à distance coupe immédiatement son accès", async () => {
    const { telephone, ordinateur } = await deuxAppareils("distance@test.com");
    const liste = await request(app).get("/api/auth/sessions").set("Cookie", telephone);
    const cible = liste.body.sessions.find((s) => s.appareil === "Chrome sur Windows");

    const res = await request(app).delete(`/api/auth/sessions/${cible.id}`).set("Cookie", telephone);
    expect(res.status).toBe(200);
    expect(res.body.actuelle).toBe(false);

    const refuse = await request(app).get("/api/auth/profil").set("Cookie", ordinateur);
    expect(refuse.status).toBe(401);
    expect(refuse.body.code).toBe("SESSION_REVOQUEE");
    expect((await request(app).get("/api/auth/profil").set("Cookie", telephone)).status).toBe(200);
  });

  test("on ne peut pas fermer la session d'un autre étudiant", async () => {
    const awa = await deuxAppareils("awa-sessions@test.com");
    const moussa = await deuxAppareils("moussa-sessions@test.com");
    const sessionsAwa = await request(app).get("/api/auth/sessions").set("Cookie", awa.telephone);
    const res = await request(app)
      .delete(`/api/auth/sessions/${sessionsAwa.body.sessions[0].id}`)
      .set("Cookie", moussa.telephone);
    expect(res.status).toBe(404);
    expect((await request(app).get("/api/auth/profil").set("Cookie", awa.telephone)).status).toBe(200);
  });

  test("identifiant de session mal formé refusé", async () => {
    const { telephone } = await deuxAppareils("forme@test.com");
    const res = await request(app).delete("/api/auth/sessions/1%20OR%201=1").set("Cookie", telephone);
    expect(res.status).toBe(400);
  });

  test("« déconnecter les autres appareils » garde seulement celui-ci", async () => {
    const { telephone, ordinateur } = await deuxAppareils("autres@test.com");
    const res = await request(app).post("/api/auth/sessions/deconnecter-autres").set("Cookie", telephone);
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBeGreaterThanOrEqual(1);
    expect((await request(app).get("/api/auth/profil").set("Cookie", ordinateur)).status).toBe(401);
    expect((await request(app).get("/api/auth/profil").set("Cookie", telephone)).status).toBe(200);
  });

  test("la déconnexion révoque la session côté serveur (un cookie copié ne sert plus)", async () => {
    const { telephone } = await deuxAppareils("logout@test.com");
    await request(app).post("/api/auth/logout").set("Cookie", telephone);
    const rejoue = await request(app).get("/api/auth/profil").set("Cookie", telephone);
    expect(rejoue.status).toBe(401);
  });

  test("changer de mot de passe déconnecte les autres appareils", async () => {
    const { telephone, ordinateur } = await deuxAppareils("changement@test.com");
    const res = await request(app)
      .put("/api/auth/changer-mot-de-passe")
      .set("Cookie", telephone)
      .send({ motDePasseActuel: "secret123", nouveauMotDePasse: "nouveauSecret456" });
    expect(res.status).toBe(200);
    const refuse = await request(app).get("/api/auth/profil").set("Cookie", ordinateur);
    expect(refuse.status).toBe(401);
  });

  test("un ancien jeton sans session est refusé", async () => {
    await request(app).post("/api/auth/inscription").send({ nom: "Awa", email: "ancien@test.com", motDePasse: "secret123" });
    const ancien = jwt.sign({ id: mockUsers[0].id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
    const res = await request(app).get("/api/auth/profil").set("Cookie", `token=${ancien}`);
    expect(res.status).toBe(401);
  });

  test("une session inactive depuis plus de 3 jours est fermée", async () => {
    const { telephone } = await deuxAppareils("inactif@test.com");
    const Session = require("../src/models/Session");
    Session.__store.forEach((s) => { s.derniereActivite = new Date(Date.now() - 4 * 24 * 3600 * 1000); });
    expect((await request(app).get("/api/auth/profil").set("Cookie", telephone)).status).toBe(401);
  });
});
