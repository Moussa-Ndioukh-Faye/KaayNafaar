/**
 * Gestion des erreurs : traduction, référence, erreurs async, route inconnue, signalement client.
 */

require("../src/erreurs/capturerAsync");
const express = require("express");
const request = require("supertest");
const { ErreurApp, traduireErreur, introuvable } = require("../src/erreurs");
const { referenceRequete, routeIntrouvable, gestionnaireErreurs } = require("../src/erreurs/middleware");

const petiteApp = (monter) => {
  const app = express();
  app.use(referenceRequete);
  app.use(express.json());
  monter(app);
  app.use(routeIntrouvable);
  app.use(gestionnaireErreurs);
  return app;
};

describe("traduireErreur", () => {
  test("erreur métier : statut, code et message conservés", () => {
    expect(traduireErreur(introuvable("Cours introuvable.", "COURS_INTROUVABLE"))).toMatchObject({
      status: 404,
      code: "COURS_INTROUVABLE",
      message: "Cours introuvable.",
    });
  });

  test("validation Sequelize → 400 avec les champs, sans détail SQL", () => {
    const err = Object.assign(new Error("Validation error: Le titre est requis"), {
      name: "SequelizeValidationError",
      errors: [{ path: "titre", message: "Le titre est requis" }],
    });
    expect(traduireErreur(err)).toMatchObject({ status: 400, code: "DONNEES_INVALIDES", details: [{ champ: "titre" }] });
  });

  test("doublon → 409, base injoignable → 503 grave, erreur SQL → 500 générique", () => {
    expect(traduireErreur(Object.assign(new Error("x"), { name: "SequelizeUniqueConstraintError" })).status).toBe(409);
    expect(traduireErreur(Object.assign(new Error("x"), { name: "SequelizeConnectionRefusedError" }))).toMatchObject({ status: 503, grave: true });
    const sql = traduireErreur(Object.assign(new Error('relation "users" does not exist'), { name: "SequelizeDatabaseError" }));
    expect(sql).toMatchObject({ status: 500, grave: true });
    expect(sql.message).not.toMatch(/relation|users/);
  });

  test("IA indisponible → 503 avec le message rédigé pour l'étudiant", () => {
    const err = Object.assign(new Error("Le service d'IA est très demandé en ce moment."), { name: "ErreurIA" });
    expect(traduireErreur(err)).toMatchObject({ status: 503, code: "IA_INDISPONIBLE", grave: false });
  });

  test("fichier trop gros (multer) → 413", () => {
    expect(traduireErreur(Object.assign(new Error("File too large"), { name: "MulterError", code: "LIMIT_FILE_SIZE" })).status).toBe(413);
  });

  test("erreur inconnue → 500 sans exposer son message", () => {
    const t = traduireErreur(new Error("mot de passe base = secret"));
    expect(t).toMatchObject({ status: 500, message: "Erreur interne du serveur." });
  });
});

describe("middlewares", () => {
  test("une fonction async qui échoue reçoit une réponse (au lieu de rester bloquée)", async () => {
    const app = petiteApp((a) =>
      a.get("/async", async () => {
        throw new ErreurApp(409, "Déjà fait.", "DEJA_FAIT");
      })
    );
    const res = await request(app).get("/async");
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, code: "DEJA_FAIT", message: "Déjà fait." });
    expect(res.body.reference).toBe(res.headers["x-request-id"]);
  });

  test("promesse rejetée par une erreur technique → 500 générique avec référence", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const app = petiteApp((a) => a.get("/panne", async () => Promise.reject(new Error("détail interne"))));
    const res = await request(app).get("/panne");
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Erreur interne du serveur.");
    expect(res.body.reference).toMatch(/^[A-Z0-9X]{4}-[A-Z0-9X0]{4}$/);
    expect(spy.mock.calls[0][0]).toContain(res.body.reference); // retrouvable dans les logs
    spy.mockRestore();
  });

  test("les réponses d'erreur des contrôleurs existants reçoivent aussi code et référence", async () => {
    const app = petiteApp((a) => a.get("/ancien", (req, res) => res.status(403).json({ success: false, message: "Non." })));
    const res = await request(app).get("/ancien");
    expect(res.body).toMatchObject({ code: "INTERDIT", message: "Non." });
    expect(res.body.reference).toBeTruthy();
  });

  test("les réponses réussies ne sont pas modifiées", async () => {
    const app = petiteApp((a) => a.get("/ok", (req, res) => res.json({ success: true })));
    expect((await request(app).get("/ok")).body).toEqual({ success: true });
  });

  test("JSON mal formé → 400 JSON_INVALIDE", async () => {
    const app = petiteApp((a) => a.post("/donnees", (req, res) => res.json(req.body)));
    const res = await request(app).post("/donnees").set("Content-Type", "application/json").send("{pas du json");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("JSON_INVALIDE");
  });

  test("une référence entrante dangereuse est remplacée", async () => {
    const app = petiteApp((a) => a.get("/ok", (req, res) => res.json({ ref: req.id })));
    const res = await request(app).get("/ok").set("X-Request-Id", "<script>");
    expect(res.body.ref).not.toBe("<script>");
  });
});
