import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur, erreurAxios } from "../../test/utils";

vi.mock("../../services/api", () => ({
  authAPI: { motDePasseOublie: vi.fn(), reinitialiserMotDePasse: vi.fn() },
}));

import { authAPI } from "../../services/api";
import MotDePasseOublie from "../MotDePasseOublie";
import ReinitialiserMotDePasse from "../ReinitialiserMotDePasse";

describe("Mot de passe oublié", () => {
  test("envoie l'adresse en minuscules et confirme l'envoi", async () => {
    authAPI.motDePasseOublie.mockResolvedValue({ data: { success: true } });
    rendreAvecRouteur(<MotDePasseOublie />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/adresse email/i), "Awa@ESP.sn");
    await user.click(screen.getByRole("button", { name: /recevoir le lien/i }));
    expect(authAPI.motDePasseOublie).toHaveBeenCalledWith("awa@esp.sn");
    expect(await screen.findByRole("heading", { name: /vérifie ta boîte mail/i })).toBeInTheDocument();
    expect(screen.getByText(/15 minutes/)).toBeInTheDocument();
  });

  test("affiche le message quand le serveur limite les demandes", async () => {
    authAPI.motDePasseOublie.mockRejectedValue(erreurAxios(429, { message: "Trop de demandes pour cette adresse." }));
    rendreAvecRouteur(<MotDePasseOublie />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/adresse email/i), "awa@esp.sn");
    await user.click(screen.getByRole("button", { name: /recevoir le lien/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/trop de demandes/i);
  });
});

describe("Réinitialisation du mot de passe", () => {
  const ouvrir = (route) =>
    rendreAvecRouteur(<ReinitialiserMotDePasse />, { route, chemin: "/reinitialiser-mot-de-passe" });

  test("sans jeton, le lien est déclaré invalide", () => {
    ouvrir("/reinitialiser-mot-de-passe");
    expect(screen.getByRole("heading", { name: /lien invalide ou expiré/i })).toBeInTheDocument();
  });

  test("refuse deux mots de passe différents", async () => {
    ouvrir("/reinitialiser-mot-de-passe?token=jeton-de-test-abcdefghijklmnop");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), "nouveauSecret42");
    await user.type(screen.getByLabelText(/confirme/i), "autreSecret42");
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ne correspondent pas/i);
    expect(authAPI.reinitialiserMotDePasse).not.toHaveBeenCalled();
  });

  test("refuse un mot de passe trop court", async () => {
    ouvrir("/reinitialiser-mot-de-passe?token=jeton-de-test-abcdefghijklmnop");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), "court");
    await user.type(screen.getByLabelText(/confirme/i), "court");
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/8 caractères/i);
  });

  test("enregistre le nouveau mot de passe puis invite à se connecter", async () => {
    authAPI.reinitialiserMotDePasse.mockResolvedValue({ data: { success: true } });
    ouvrir("/reinitialiser-mot-de-passe?token=jeton-de-test-abcdefghijklmnop");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), "nouveauSecret42");
    await user.type(screen.getByLabelText(/confirme/i), "nouveauSecret42");
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));
    await waitFor(() =>
      expect(authAPI.reinitialiserMotDePasse).toHaveBeenCalledWith("jeton-de-test-abcdefghijklmnop", "nouveauSecret42")
    );
    expect(await screen.findByRole("link", { name: /se connecter/i })).toHaveAttribute("href", "/connexion");
  });

  test("un jeton expiré affiche l'écran « lien invalide »", async () => {
    authAPI.reinitialiserMotDePasse.mockRejectedValue(erreurAxios(400, { code: "JETON_INVALIDE" }));
    ouvrir("/reinitialiser-mot-de-passe?token=jeton-de-test-abcdefghijklmnop");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/nouveau mot de passe/i), "nouveauSecret42");
    await user.type(screen.getByLabelText(/confirme/i), "nouveauSecret42");
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(await screen.findByRole("heading", { name: /lien invalide ou expiré/i })).toBeInTheDocument();
  });
});
