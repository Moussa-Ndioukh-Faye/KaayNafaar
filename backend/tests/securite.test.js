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
      for (const champ of ["jetonVerification", "jetonReinitialisation"]) {
        if (where[champ]) {
          const borne = where[`${champ}Expire`];
          const limite = borne && Object.getOwnPropertySymbols(borne).map((s) => borne[s])[0];
          return u[champ] === where[champ] && (!limite || new Date(u[`${champ}Expire`]) > limite);
        }
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
  M.prototype.save = jest.fn(async function () {
    const ligne = mockUsers.find((u) => u.id === this.id);
    const copie = { ...this };
    if (ligne && copie.motDePasse !== ligne.motDePasse) copie.motDePasse = await bcrypt.hash(copie.motDePasse, 4);
    if (ligne) Object.assign(ligne, copie);
    this.motDePasse = copie.motDePasse;
    return this;
  });
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
    notifierMotDePasseModifie: jest.fn(async () => ({ envoye: true })),
    envoyerReinitialisation: jest.fn(async (u) => {
      const jeton = `reinit-de-test-${Date.now()}-abcdefghijklmnop`;
      await u.update({
        jetonReinitialisation: reel.hacherJeton(jeton),
        jetonReinitialisationExpire: new Date(Date.now() + reel.DUREE_REINITIALISATION_MS),
      });
      global.__jetonReinit = jeton;
      return { envoye: true };
    }),
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

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../server");
const { signalerEchecConnexion, masquerEmail, SEUIL, _reinitialiser } = require("../src/utils/journalSecurite");
const { verifierContenuFichier } = require("../src/middleware/verifierFichier");
const { quotaQuotidien } = require("../src/middleware/quotaIA");
const { DOSSIER_UPLOADS } = require("../src/utils/fichiers");

const creerCompte = (email, motDePasse = "ancienMotDePasse1") =>
  request(app).post("/api/auth/inscription").send({ nom: "Moussa Faye", email, motDePasse });

describe("Mot de passe oublié", () => {
  beforeEach(() => {
    mockUsers.length = 0;
    global.__jetonReinit = undefined;
  });

  test("la réponse est identique que le compte existe ou non", async () => {
    await creerCompte("reinit1@test.com");
    const existant = await request(app).post("/api/auth/mot-de-passe-oublie").send({ email: "reinit1@test.com" });
    const inconnu = await request(app).post("/api/auth/mot-de-passe-oublie").send({ email: "fantome@test.com" });
    expect(existant.status).toBe(200);
    expect(inconnu.status).toBe(200);
    expect(existant.body.message).toBe(inconnu.body.message);
    expect(global.__jetonReinit).toBeDefined();
  });

  test("le lien change le mot de passe, ne sert qu'une fois et n'ouvre pas de session", async () => {
    await creerCompte("reinit2@test.com");
    await request(app).post("/api/auth/mot-de-passe-oublie").send({ email: "reinit2@test.com" });
    const jeton = global.__jetonReinit;

    const ok = await request(app)
      .post("/api/auth/reinitialiser-mot-de-passe")
      .send({ token: jeton, nouveauMotDePasse: "nouveauSecret42" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeUndefined();
    expect(mockUsers[0].jetonReinitialisation).toBeNull();

    const encore = await request(app)
      .post("/api/auth/reinitialiser-mot-de-passe")
      .send({ token: jeton, nouveauMotDePasse: "autreSecret42" });
    expect(encore.status).toBe(400);

    const ancien = await request(app).post("/api/auth/connexion").send({ email: "reinit2@test.com", motDePasse: "ancienMotDePasse1" });
    expect(ancien.status).toBe(401);
    const nouveau = await request(app).post("/api/auth/connexion").send({ email: "reinit2@test.com", motDePasse: "nouveauSecret42" });
    expect(nouveau.status).toBe(200);
  });

  test("un lien expiré (plus de 15 minutes) est refusé", async () => {
    await creerCompte("reinit3@test.com");
    await request(app).post("/api/auth/mot-de-passe-oublie").send({ email: "reinit3@test.com" });
    mockUsers[0].jetonReinitialisationExpire = new Date(Date.now() - 1000);
    const res = await request(app)
      .post("/api/auth/reinitialiser-mot-de-passe")
      .send({ token: global.__jetonReinit, nouveauMotDePasse: "nouveauSecret42" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("JETON_INVALIDE");
  });

  test("le nouveau mot de passe respecte la politique (8 caractères minimum)", async () => {
    const res = await request(app)
      .post("/api/auth/reinitialiser-mot-de-passe")
      .send({ token: "x".repeat(43), nouveauMotDePasse: "court" });
    expect(res.status).toBe(400);
  });
});

describe("Limite de tentatives par compte", () => {
  beforeEach(() => {
    mockUsers.length = 0;
  });

  test("un compte attaqué est bloqué sans bloquer les autres comptes", async () => {
    await creerCompte("cible@test.com");
    await creerCompte("voisin@test.com");

    let derniere;
    for (let i = 0; i < 11; i++) {
      derniere = await request(app).post("/api/auth/connexion").send({ email: "cible@test.com", motDePasse: "mauvais-mdp" });
    }
    expect(derniere.status).toBe(429);

    const voisin = await request(app).post("/api/auth/connexion").send({ email: "voisin@test.com", motDePasse: "ancienMotDePasse1" });
    expect(voisin.status).toBe(200);
  });

  test("le serveur lit l'IP du client derrière les proxys configurés", () => {
    expect(typeof app.get("trust proxy")).toBe("number");
  });
});

describe("Détection d'activité suspecte", () => {
  beforeEach(() => _reinitialiser());

  test(`alerte à partir de ${SEUIL} échecs rapprochés`, () => {
    const req = { ip: "203.0.113.7", method: "POST", path: "/api/auth/connexion" };
    const resultats = [];
    for (let i = 0; i < SEUIL; i++) resultats.push(signalerEchecConnexion(req, "victime@test.com"));
    expect(resultats.slice(0, SEUIL - 1).every((r) => r === false)).toBe(true);
    expect(resultats[SEUIL - 1]).toBe(true);
  });

  test("les emails sont masqués dans le journal", () => {
    expect(masquerEmail("moussa@esp.sn")).toBe("mo***@esp.sn");
  });
});

describe("Contrôle du contenu des fichiers", () => {
  const ecrire = (nom, contenu) => {
    const chemin = path.join(DOSSIER_UPLOADS, nom);
    fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
    fs.writeFileSync(chemin, contenu);
    return chemin;
  };
  const executer = async (fichier) => {
    const res = { statut: 200, status(c) { this.statut = c; return this; }, json(b) { this.corps = b; return this; } };
    let suivant = false;
    await verifierContenuFichier({ file: fichier, ip: "127.0.0.1" }, res, () => { suivant = true; });
    return { suivant, res };
  };

  test("un vrai PDF passe", async () => {
    const chemin = ecrire("test-vrai.pdf", "%PDF-1.7\n...");
    const { suivant } = await executer({ path: chemin, originalname: "cours.pdf", mimetype: "application/pdf" });
    expect(suivant).toBe(true);
    fs.unlinkSync(chemin);
  });

  test("un exécutable renommé en .pdf est refusé et supprimé", async () => {
    const chemin = ecrire("test-faux.pdf", Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]));
    const { suivant, res } = await executer({ path: chemin, originalname: "cours.pdf", mimetype: "application/pdf" });
    expect(suivant).toBe(false);
    expect(res.statut).toBe(400);
    expect(fs.existsSync(chemin)).toBe(false);
  });

  test("un binaire renommé en .txt est refusé", async () => {
    const chemin = ecrire("test-faux.txt", Buffer.from([0x00, 0xff, 0x10, 0x00]));
    const { suivant } = await executer({ path: chemin, originalname: "notes.txt", mimetype: "text/plain" });
    expect(suivant).toBe(false);
  });

  test("un texte UTF-8 (accents, wolof) passe", async () => {
    const chemin = ecrire("test-vrai.txt", "Leçon : jàng ak xam-xam — révision");
    const { suivant } = await executer({ path: chemin, originalname: "notes.txt", mimetype: "text/plain" });
    expect(suivant).toBe(true);
    fs.unlinkSync(chemin);
  });
});

describe("Quota quotidien par utilisateur", () => {
  test("bloque au-delà du quota, utilisateur par utilisateur", () => {
    process.env.QUOTA_TEST = "2";
    const quota = quotaQuotidien("test", "QUOTA_TEST", 99, "Limite atteinte");
    const appel = (id) => {
      const res = { statut: 200, set() {}, status(c) { this.statut = c; return this; }, json() { return this; } };
      let suivant = false;
      quota({ utilisateur: { id } }, res, () => { suivant = true; });
      return suivant ? 200 : res.statut;
    };
    expect([appel(1), appel(1), appel(1)]).toEqual([200, 200, 429]);
    expect(appel(2)).toBe(200);
    delete process.env.QUOTA_TEST;
  });
});
