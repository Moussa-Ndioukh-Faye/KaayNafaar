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
