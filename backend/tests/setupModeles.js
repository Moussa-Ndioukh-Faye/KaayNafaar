/**
 * Modèles simulés pour tous les tests (en mémoire) : Session, CarnetMessage, CarnetProduction.
 * Les jetons de test portent sid = "session-test" : cette session est toujours active,
 * sauf si un test la révoque explicitement.
 */
jest.mock("../src/models/Session", () => {
  const crypto = require("crypto");
  const { Op } = require("sequelize");
  const store = [];
  const futur = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const enrichir = (s) => ({
    ...s,
    update: jest.fn(async (d) => Object.assign(s, d)),
  });
  const correspond = (s, where = {}) =>
    Object.entries(where).every(([k, v]) => {
      if (v === null) return s[k] === null || s[k] === undefined;
      if (Array.isArray(v)) return v.includes(s[k]);
      if (v && typeof v === "object" && !(v instanceof Date)) {
        if (Op.ne in v) return s[k] !== v[Op.ne];
        if (Op.gt in v) return new Date(s[k]) > new Date(v[Op.gt]);
        if (Op.lt in v) return new Date(s[k]) < new Date(v[Op.lt]);
        return true;
      }
      return s[k] === v;
    });
  const obtenir = (id, utilisateurId) => {
    let s = store.find((x) => x.id === id);
    if (!s && id === "session-test") {
      s = { id, utilisateurId, appareil: "Chrome sur Linux", typeAppareil: "ordinateur", revoqueeLe: null, expireLe: futur(), derniereActivite: new Date(), createdAt: new Date() };
      store.push(s);
    }
    return s;
  };
  const Session = {
    __store: store,
    findOne: jest.fn(async ({ where }) => {
      const s = obtenir(where.id, where.utilisateurId);
      return s && s.utilisateurId === where.utilisateurId ? enrichir(s) : null;
    }),
    create: jest.fn(async (d) => {
      const s = { id: crypto.randomUUID(), revoqueeLe: null, createdAt: new Date(), ...d };
      store.push(s);
      return enrichir(s);
    }),
    findAll: jest.fn(async ({ where } = {}) =>
      store.filter((s) => correspond(s, where)).sort((a, b) => new Date(b.derniereActivite) - new Date(a.derniereActivite))
    ),
    update: jest.fn(async (d, { where }) => {
      const cibles = store.filter((s) => correspond(s, where));
      cibles.forEach((s) => Object.assign(s, d));
      return [cibles.length];
    }),
    destroy: jest.fn(async () => 0),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
  };
  return Session;
});


// Historique du chat et productions des carnets, en mémoire pour tous les tests
jest.mock("../src/models/CarnetMessage", () => require("./support/modeleMemoire")("CarnetMessage"));
jest.mock("../src/models/CarnetProduction", () => require("./support/modeleMemoire")("CarnetProduction"));
