const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-chars!!";
process.env.NODE_ENV = "test";

const mockModelData = {
  users: [],
  courses: [],
  fiches: [],
  quizzes: [],
  progressions: [],
  nextId: 1,
};

function makeToken(userId = 1) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

function authCookie(userId = 1) {
  return `token=${makeToken(userId)}`;
}

function resetData() {
  mockModelData.users.length = 0;
  mockModelData.courses.length = 0;
  mockModelData.fiches.length = 0;
  mockModelData.quizzes.length = 0;
  mockModelData.progressions.length = 0;
  mockModelData.nextId = 1;
}

function createMockModel(name, store, extraPrototype = {}) {
  const M = function (data) { Object.assign(this, data || {}); };
  Object.assign(M.prototype, {
    save: jest.fn(async function () { return this; }),
    update: jest.fn(async function (d) { Object.assign(this, d); return this; }),
    destroy: jest.fn(async function () {}),
    verifierMotDePasse: jest.fn(async function () { return true; }),
    toJSON: function () { return { ...this }; },
    ...extraPrototype,
  });

  M.findOne = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const entry = store.find((item) =>
      Object.entries(where).every(([k, v]) => item[k] === v)
    );
    return entry ? Object.assign(new M(), entry) : null;
  });

  M.findByPk = jest.fn(async (id) => {
    const entry = store.find((u) => u.id === id);
    return entry ? Object.assign(new M(), entry) : null;
  });

  M.findAll = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const results = store.filter((item) =>
      Object.entries(where).every(([k, v]) => item[k] === v)
    );
    return results.map((r) => Object.assign(new M(), r));
  });

  M.create = jest.fn(async (data) => {
    const entry = { id: mockModelData.nextId++, ...data };
    store.push(entry);
    return Object.assign(new M(), entry);
  });

  M.destroy = jest.fn(async (opts) => {
    const where = opts?.where || {};
    const idx = store.findIndex((item) =>
      Object.entries(where).every(([k, v]) => item[k] === v)
    );
    if (idx === -1) return 0;
    store.splice(idx, 1);
    return 1;
  });

  M.update = jest.fn(async (data, opts) => {
    const where = opts?.where || {};
    const entry = store.find((item) =>
      Object.entries(where).every(([k, v]) => item[k] === v)
    );
    if (entry) Object.assign(entry, data);
    return [entry ? 1 : 0];
  });

  M.belongsTo = jest.fn();
  M.hasMany = jest.fn();
  M.hasOne = jest.fn();
  M.belongsToMany = jest.fn();

  return M;
}

function setupModelMocks() {
  jest.mock("../src/config/database", () => ({
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(),
      close: jest.fn().mockResolvedValue(),
      sync: jest.fn().mockResolvedValue(),
      define: jest.fn(() => ({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
        hasOne: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        destroy: jest.fn(),
        update: jest.fn(),
      })),
    },
    connectDB: jest.fn().mockResolvedValue(),
  }));

  jest.mock("../src/models/User", () =>
    createMockModel("User", mockModelData.users, {
      verifierMotDePasse: async function (_pwd) { return true; },
    })
  );

  jest.mock("../src/models/Course", () =>
    createMockModel("Course", mockModelData.courses)
  );

  jest.mock("../src/models/Fiche", () =>
    createMockModel("Fiche", mockModelData.fiches)
  );

  jest.mock("../src/models/Quiz", () =>
    createMockModel("Quiz", mockModelData.quizzes)
  );

  jest.mock("../src/models/Progression", () =>
    createMockModel("Progression", mockModelData.progressions)
  );
}

module.exports = {
  mockModelData,
  makeToken,
  authCookie,
  resetData,
  setupModelMocks,
};
