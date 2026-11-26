import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur } from "../../test/utils";

vi.mock("../../services/api", () => ({
  coursAPI: { getCours: vi.fn(), creerCours: vi.fn(), supprimerCours: vi.fn(), importerLien: vi.fn() },
}));

import { coursAPI } from "../../services/api";
import MesCours from "../MesCours";

const cours = (extra) => ({ id: 1, titre: "Administration système", matiere: "Systèmes", niveau: "intermédiaire", tags: [], ...extra });

beforeEach(() => vi.clearAllMocks());

test("pendant la lecture, la carte montre la progression de l'IA", async () => {
  coursAPI.getCours.mockResolvedValue({ data: { cours: [cours({ lecture: { etat: "lecture", pagesLues: 16, total: 40 } })] } });
  rendreAvecRouteur(<MesCours />);
  expect(await screen.findByText("L'IA lit ton document… 16/40 p.")).toBeInTheDocument();
});

test("lecture impossible signalée sur la carte", async () => {
  coursAPI.getCours.mockResolvedValue({ data: { cours: [cours({ lecture: { etat: "echec" } })] } });
  rendreAvecRouteur(<MesCours />);
  expect(await screen.findByText("Lecture impossible")).toBeInTheDocument();
});

test("avec un fichier, le contenu tapé devient facultatif et le fichier est envoyé", async () => {
  coursAPI.getCours.mockResolvedValue({ data: { cours: [] } });
  coursAPI.creerCours.mockResolvedValue({ data: { success: true } });
  const user = userEvent.setup();
  rendreAvecRouteur(<MesCours />);
  await user.click((await screen.findAllByRole("button", { name: /Ajouter un cours/ }))[0]);
  await user.type(screen.getByLabelText("Titre du cours *"), "Admin système");
  await user.type(screen.getByLabelText("Matière *"), "Systèmes");
  await user.upload(screen.getByLabelText(/^Fichier/), new File(["%PDF"], "cours.pdf", { type: "application/pdf" }));

  expect(screen.getByLabelText(/Notes/)).not.toBeRequired();
  await user.click(screen.getByRole("button", { name: /Enregistrer|Créer|Ajouter le cours/ }));
  await waitFor(() => expect(coursAPI.creerCours).toHaveBeenCalled());
  const envoi = coursAPI.creerCours.mock.calls[0][0];
  expect(envoi.get("fichier").name).toBe("cours.pdf");
  expect(await screen.findByText(/l'IA lit ton document/)).toBeInTheDocument();
});
