import { render } from "@testing-library/react";
import { formatMessage } from "./formatMessage";

const rendre = (texte) => render(<div>{formatMessage(texte)}</div>).container;

describe("Mise en forme des réponses de l'IA", () => {
  test("titres, gras et listes regroupées dans un vrai <ul>", () => {
    const c = rendre("## Titre\nTexte **important**\n- un\n- deux\nFin");
    expect(c.querySelector("h3")).toHaveTextContent("Titre");
    expect(c.querySelector("strong")).toHaveTextContent("important");
    expect(c.querySelectorAll("ul")).toHaveLength(1);
    expect(c.querySelectorAll("ul > li")).toHaveLength(2);
  });

  test("le HTML renvoyé par l'IA est affiché comme du texte, jamais exécuté", () => {
    const c = rendre('<img src=x onerror="alert(1)"> et <script>x()</script>');
    expect(c.querySelector("img")).toBeNull();
    expect(c.querySelector("script")).toBeNull();
    expect(c).toHaveTextContent("<img src=x");
  });
});

describe("Formules et citations", () => {
  test("une formule LaTeX est rendue par KaTeX", () => {
    const c = rendre("L'aire vaut $\\pi r^2$ et\n$$\\int_0^1 x\\,dx = \\frac{1}{2}$$");
    expect(c.querySelectorAll(".katex").length).toBe(2);
    expect(c.querySelector(".katex-display")).not.toBeNull();
  });

  test("une formule malveillante n'injecte ni lien ni script", () => {
    const c = rendre("$\\href{javascript:alert(1)}{clic}$ et $\\htmlClass{x}{y}$");
    expect(c.querySelector("a, [href], script")).toBeNull(); // le texte reste affiché, sans devenir un lien
    expect(c.querySelector(".x")).toBeNull();
  });

  test("les citations [n] deviennent des boutons qui ouvrent le passage", async () => {
    const vu = [];
    const passages = [{ n: 1, titre: "Réseaux", texte: "SSH utilise le port 22." }];
    const { getByRole } = render(<div>{formatMessage("SSH écoute sur le port 22 [1].", { passages, surCitation: (p) => vu.push(p) })}</div>);
    getByRole("button", { name: /source 1 : réseaux/i }).click();
    expect(vu[0].texte).toBe("SSH utilise le port 22.");
  });
});
