import { enTexte } from "./texte";

describe("enTexte", () => {
  test("garde les chaînes et les nombres", () => {
    expect(enTexte("SSH")).toBe("SSH");
    expect(enTexte(22)).toBe("22");
  });
  test("transforme un objet concept en texte lisible", () => {
    expect(enTexte({ terme: "SSH", definition: "Secure Shell" })).toBe("SSH : Secure Shell");
    expect(enTexte({ nom: "TCP" })).toBe("TCP");
  });
  test("ne plante jamais", () => {
    expect(enTexte(null)).toBe("");
    expect(enTexte({ a: "x", b: "y", c: 3 })).toBe("x — y");
  });
});
