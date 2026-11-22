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
    const found = mockUsers.find((u) => {
      if (where.email) return u.email === where.email;
      if (where.jetonVerification) {
        const limite = where.jetonVerificationExpire && Object.getOwnPropertySymbols(where.jetonVerificationExpire).map((s) => where.jetonVerificationExpire[s])[0];
        return u.jetonVerification === where.jetonVerification && (!limite || new Date(u.jetonVerificationExpire) > limite);
      }
      return where.id ? u.id === where.id : false;
    });
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
  M.prototype.update = jest.fn(async function (d) {
    Object.assign(this, d);
    const ligne = mockUsers.find((u) => u.id === this.id);
    if (ligne) Object.assign(ligne, d);
    return this;
  });
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

// Capture du lien envoyé par email (aucun appel réseau)
jest.mock("../src/utils/email", () => {
  const reel = jest.requireActual("../src/utils/email");
  return {
    ...reel,
    envoyerVerification: jest.fn(async (u) => {
      const jeton = `jeton-de-test-${Date.now()}-abcdefghijklmnop`;
      await u.update({
        jetonVerification: reel.hacherJeton(jeton),
        jetonVerificationExpire: new Date(Date.now() + 24 * 3600 * 1000),
      });
      global.__dernierJeton = jeton;
      return { envoye: true };
    }),
  };
});

const request = require("supertest");
const app = require("../server");

describe("Vérification de l'adresse email", () => {
  const compte = { nom: "Awa Diop", email: "awa@test.com", motDePasse: "secret123" };

  beforeAll(() => {
    process.env.EMAIL_VERIFICATION = "true";
  });
  afterAll(() => {
    delete process.env.EMAIL_VERIFICATION;
  });
  beforeEach(() => {
    mockUsers.length = 0;
  });

  test("l'inscription n'ouvre pas de session et demande la confirmation", async () => {
    const res = await request(app).post("/api/auth/inscription").send(compte);
    expect(res.status).toBe(201);
    expect(res.body.verificationRequise).toBe(true);
    expect(res.body.token).toBeUndefined();
    expect(mockUsers[0].emailVerifie).toBe(false);
  });

  test("connexion refusée tant que l'email n'est pas confirmé", async () => {
    await request(app).post("/api/auth/inscription").send(compte);
    const res = await request(app).post("/api/auth/connexion").send({ email: compte.email, motDePasse: compte.motDePasse });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NON_VERIFIE");
  });

  test("le lien confirme l'adresse, connecte l'utilisateur et ne sert qu'une fois", async () => {
    await request(app).post("/api/auth/inscription").send(compte);
    const jeton = global.__dernierJeton;

    const ok = await request(app).post("/api/auth/verifier-email").send({ token: jeton });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeUndefined(); // session ouverte par cookie httpOnly uniquement
    expect(String(ok.headers["set-cookie"])).toMatch(/token=.*HttpOnly/i);
    expect(ok.body.utilisateur.emailVerifie).toBe(true);
    expect(mockUsers[0].jetonVerification).toBeNull();

    const encore = await request(app).post("/api/auth/verifier-email").send({ token: jeton });
    expect(encore.status).toBe(400);

    const connexion = await request(app).post("/api/auth/connexion").send({ email: compte.email, motDePasse: compte.motDePasse });
    expect(connexion.status).toBe(200);
  });

  test("un jeton expiré est refusé", async () => {
    await request(app).post("/api/auth/inscription").send(compte);
    mockUsers[0].jetonVerificationExpire = new Date(Date.now() - 1000);
    const res = await request(app).post("/api/auth/verifier-email").send({ token: global.__dernierJeton });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("JETON_INVALIDE");
  });

  test("le renvoi répond pareil que le compte existe ou non", async () => {
    await request(app).post("/api/auth/inscription").send(compte);
    const existant = await request(app).post("/api/auth/renvoyer-verification").send({ email: compte.email });
    const inconnu = await request(app).post("/api/auth/renvoyer-verification").send({ email: "personne@test.com" });
    expect(existant.status).toBe(200);
    expect(inconnu.status).toBe(200);
    expect(existant.body.message).toBe(inconnu.body.message);
  });
});
