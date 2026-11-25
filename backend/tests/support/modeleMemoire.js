/**
 * Modèle Sequelize simulé en mémoire, pour les tests (create, findAll, findOne,
 * count, destroy, bulkCreate ; filtres simples, Op.ne/gt/lt, ordre et limite).
 */
const { Op } = require("sequelize");

const correspond = (ligne, where = {}) =>
  Object.entries(where).every(([cle, v]) => {
    if (v === null) return ligne[cle] === null || ligne[cle] === undefined;
    if (Array.isArray(v)) return v.map(String).includes(String(ligne[cle]));
    if (v && typeof v === "object" && !(v instanceof Date)) {
      if (Op.ne in v) return ligne[cle] !== v[Op.ne];
      if (Op.gt in v) return ligne[cle] > v[Op.gt];
      if (Op.lt in v) return ligne[cle] < v[Op.lt];
      return true;
    }
    return String(ligne[cle]) === String(v);
  });

module.exports = (nom) => {
  const store = [];
  let suivant = 1;
  const donnees = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v !== "function"));
  const instance = (ligne) => ({
    ...ligne,
    toJSON() {
      return donnees(this);
    },
    changed() {},
    async save() {
      const i = store.findIndex((l) => l.id === this.id);
      store[i] = { ...donnees(this), updatedAt: new Date() };
      return this;
    },
    async destroy() {
      const i = store.findIndex((l) => l.id === this.id);
      if (i >= 0) store.splice(i, 1);
    },
  });
  const trier = (lignes, order) => {
    if (!order?.length) return lignes;
    const [[cle, sens]] = order;
    return [...lignes].sort((a, b) => (a[cle] > b[cle] ? 1 : a[cle] < b[cle] ? -1 : a.id - b.id) * (sens === "DESC" ? -1 : 1));
  };
  const M = {
    nom,
    __store: store,
    create: jest.fn(async (d) => {
      const maintenant = new Date(Date.now() + suivant); // dates strictement croissantes
      const ligne = { id: suivant++, createdAt: maintenant, updatedAt: maintenant, ...d };
      store.push(ligne);
      return instance({ ...ligne });
    }),
    bulkCreate: jest.fn(async (liste) => Promise.all(liste.map((d) => M.create(d)))),
    findAll: jest.fn(async ({ where, order, limit } = {}) => {
      const lignes = trier(store.filter((l) => correspond(l, where)), order);
      return (limit ? lignes.slice(0, limit) : lignes).map((l) => instance({ ...l }));
    }),
    findOne: jest.fn(async ({ where } = {}) => {
      const l = store.find((x) => correspond(x, where));
      return l ? instance({ ...l }) : null;
    }),
    count: jest.fn(async ({ where, group } = {}) => {
      const lignes = store.filter((l) => correspond(l, where));
      if (!group) return lignes.length;
      const parGroupe = new Map();
      lignes.forEach((l) => parGroupe.set(l[group[0]], (parGroupe.get(l[group[0]]) || 0) + 1));
      return [...parGroupe].map(([valeur, count]) => ({ [group[0]]: valeur, count }));
    }),
    destroy: jest.fn(async ({ where } = {}) => {
      const avant = store.length;
      for (let i = store.length - 1; i >= 0; i -= 1) if (correspond(store[i], where)) store.splice(i, 1);
      return avant - store.length;
    }),
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
  };
  return M;
};
