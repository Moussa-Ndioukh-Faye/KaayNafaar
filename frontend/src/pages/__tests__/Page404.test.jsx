import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { rendreAvecRouteur } from "../../test/utils";

let utilisateur = null;
vi.mock("../../App", () => ({ useAuth: () => ({ utilisateur }) }));

import Page404 from "../Page404";

describe("Page 404", () => {
  test("affiche l'adresse demandée et des liens pour un visiteur", () => {
    utilisateur = null;
    rendreAvecRouteur(<Page404 />, { route: "/page-inconnue" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/pas au programme/i);
    expect(screen.getByText("/page-inconnue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /me connecter/i })).toHaveAttribute("href", "/connexion");
    expect(screen.getByRole("link", { name: /créer un compte/i })).toHaveAttribute("href", "/inscription");
  });

  test("propose l'espace étudiant quand on est connecté", () => {
    utilisateur = { id: 1, nom: "Awa" };
    rendreAvecRouteur(<Page404 />, { route: "/page-inconnue" });
    expect(screen.getByRole("link", { name: /mes cours/i })).toHaveAttribute("href", "/mes-cours");
    expect(screen.getByRole("link", { name: /assistant ia/i })).toHaveAttribute("href", "/assistant");
    expect(screen.queryByRole("link", { name: /me connecter/i })).not.toBeInTheDocument();
  });
});
