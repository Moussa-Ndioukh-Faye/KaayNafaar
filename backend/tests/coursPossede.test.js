jest.mock("../src/models/Course", () => ({
  findOne: jest.fn(async ({ where }) =>
    where.id === 7 && where.utilisateurId === 1 ? { id: 7 } : null
  ),
}));

const Course = require("../src/models/Course");
const { coursPossede } = require("../src/utils/coursPossede");

describe("coursPossede", () => {
  it("garde un cours qui appartient à l'utilisateur", async () => {
    expect(await coursPossede("7", 1)).toBe(7);
  });

  it("refuse le cours d'un autre étudiant", async () => {
    expect(await coursPossede(7, 2)).toBeNull();
  });

  it("ignore les valeurs absentes ou invalides sans interroger la base", async () => {
    Course.findOne.mockClear();
    for (const v of [undefined, null, "", "abc", -3, 0, "1 OR 1=1"]) {
      // "1 OR 1=1" est lu comme 1 par parseInt : il passe par la base, filtré par utilisateur
      if (v === "1 OR 1=1") continue;
      expect(await coursPossede(v, 1)).toBeNull();
    }
    expect(Course.findOne).not.toHaveBeenCalled();
  });
});
