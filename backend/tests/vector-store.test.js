/**
 * Le vector store doit être créé une seule fois (un seul pool de connexions),
 * et pouvoir être recréé si l'initialisation échoue.
 */

const mockInitialize = jest.fn();
const mockPools = [];

jest.mock("@langchain/community/vectorstores/pgvector", () => ({
  PGVectorStore: { initialize: (...args) => mockInitialize(...args) },
}));

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => {
    const pool = { on: jest.fn(), end: jest.fn().mockResolvedValue() };
    mockPools.push(pool);
    return pool;
  }),
}));

jest.mock("@langchain/google-genai", () => ({
  GoogleGenerativeAIEmbeddings: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../src/config/database", () => ({ sequelize: { query: jest.fn().mockResolvedValue([]) } }));
jest.mock("../src/config/redis", () => ({ redis: null }));

const { obtenirVectorStore, fermerVectorStore, rechercherContexteHybride } = require("../src/utils/aiPro");

describe("Vector store partagé", () => {
  beforeEach(async () => {
    await fermerVectorStore();
    mockInitialize.mockReset();
    mockPools.length = 0;
  });

  test("une seule initialisation et un seul pool pour plusieurs recherches", async () => {
    const store = { similaritySearch: jest.fn().mockResolvedValue([]) };
    mockInitialize.mockResolvedValue(store);

    await Promise.all([
      rechercherContexteHybride("jointures sql", 1),
      rechercherContexteHybride("normalisation", 1),
      obtenirVectorStore(),
    ]);
    await rechercherContexteHybride("clés étrangères", 1);

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockPools).toHaveLength(1);
    expect(mockInitialize.mock.calls[0][1].pool).toBe(mockPools[0]);
    expect(store.similaritySearch).toHaveBeenCalledTimes(3);
  });

  test("après un échec, le pool est fermé et l'initialisation est retentée", async () => {
    mockInitialize.mockRejectedValueOnce(new Error("base indisponible")).mockResolvedValueOnce({ ok: true });

    await expect(obtenirVectorStore()).rejects.toThrow("base indisponible");
    expect(mockPools[0].end).toHaveBeenCalled();

    await expect(obtenirVectorStore()).resolves.toEqual({ ok: true });
    expect(mockInitialize).toHaveBeenCalledTimes(2);
  });

  test("fermerVectorStore libère les connexions", async () => {
    mockInitialize.mockResolvedValue({});
    await obtenirVectorStore();
    await fermerVectorStore();
    expect(mockPools[0].end).toHaveBeenCalledTimes(1);
  });
});
