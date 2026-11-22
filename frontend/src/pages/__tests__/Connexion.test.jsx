import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur, erreurAxios } from "../../test/utils";

const connecter = vi.fn();
vi.mock("../../App", () => ({ useAuth: () => ({ connecter, utilisateur: null }) }));
vi.mock("../../services/api", () => ({
  authAPI: { connexion: vi.fn(), renvoyerVerification: vi.fn() },
}));

import { authAPI } from "../../services/api";
import Connexion from "../Connexion";

const afficher = (route = "/connexion") =>
  rendreAvecRouteur(<Connexion />, { route, chemin: "/connexion", autresRoutes: { "/": "Tableau de bord" } });

const remplir = async (email, motDePasse) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/adresse email/i), email);
  await user.type(screen.getByLabelText(/^mot de passe$/i), motDePasse);
  await user.click(screen.getByRole("button", { name: /se connecter/i }));
};

describe("Page Connexion", () => {
  test("propose le lien « Mot de passe oublié ? »", () => {
    afficher();
    expect(screen.getByRole("link", { name: /mot de passe oublié/i })).toHaveAttribute("href", "/mot-de-passe-oublie");
  });

  test("refuse un email invalide sans appeler le serveur", async () => {
    afficher();
    await remplir("pas-un-email", "motdepasse1");
    expect(await screen.findByRole("alert")).toHaveTextContent(/email invalide/i);
    expect(authAPI.connexion).not.toHaveBeenCalled();
  });

  test("connecte l'étudiant et l'envoie au tableau de bord", async () => {
    authAPI.connexion.mockResolvedValue({ data: { utilisateur: { id: 1, nom: "Awa" } } });
    afficher();
    await remplir("awa@esp.sn", "motdepasse1");
    await waitFor(() => expect(connecter).toHaveBeenCalledWith({ id: 1, nom: "Awa" }));
    expect(await screen.findByText("Tableau de bord")).toBeInTheDocument();
    expect(authAPI.connexion).toHaveBeenCalledWith({ email: "awa@esp.sn", motDePasse: "motdepasse1" });
  });

  test("affiche le message du serveur en cas d'échec", async () => {
    authAPI.connexion.mockRejectedValue(erreurAxios(401, { message: "Email ou mot de passe incorrect." }));
    afficher();
    await remplir("awa@esp.sn", "mauvais-mdp");
    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
    expect(connecter).not.toHaveBeenCalled();
  });

  test("affiche l'écran de confirmation si l'email n'est pas vérifié", async () => {
    authAPI.connexion.mockRejectedValue(erreurAxios(403, { code: "EMAIL_NON_VERIFIE", email: "awa@esp.sn" }));
    afficher();
    await remplir("awa@esp.sn", "motdepasse1");
    expect(await screen.findByText(/awa@esp\.sn/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /se connecter/i })).not.toBeInTheDocument();
  });

  test("signale une session expirée", () => {
    afficher("/connexion?session=expiree");
    expect(screen.getByRole("alert")).toHaveTextContent(/session a expiré/i);
  });
});
