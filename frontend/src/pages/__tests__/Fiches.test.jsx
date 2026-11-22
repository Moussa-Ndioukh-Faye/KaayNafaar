import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur } from "../../test/utils";

vi.mock("../../services/api", () => ({
  fichesAPI: {
    getFiches: vi.fn(),
    supprimerFiche: vi.fn(),
    modifierFiche: vi.fn(),
    mettreAJourFlashcard: vi.fn(),
  },
  coursAPI: { getCours: vi.fn() },
  iaAPI: { genererFicheStream: vi.fn() },
}));
vi.mock("../../utils/pdfPro", () => ({ exporterFichePro: vi.fn() }));

import { fichesAPI, coursAPI, iaAPI } from "../../services/api";
import Fiches from "../Fiches";

const demain = new Date(Date.now() + 86400000).toISOString();

const FICHE = {
  id: 4,
  titre: "Fiche - Réseaux",
  estPublique: false,
  createdAt: "2026-11-20T10:00:00Z",
  contenu: {
    resume: "SSH remplace Telnet grâce au chiffrement.",
    conceptsCles: [{ terme: "SSH", definition: "Secure Shell" }],
    pointsImportants: ["Port 22"],
  },
  flashcards: [
    // La première carte n'est à revoir que demain : elle passe en second
    { question: "Port de SSH ?", reponse: "22", nextReview: demain },
    { question: "Que remplace SSH ?", reponse: "Telnet" },
  ],
};

const COURS = [{ id: 3, titre: "Services réseaux", contenu: "SSH chiffre les échanges." }];

beforeEach(() => {
  fichesAPI.getFiches.mockResolvedValue({ data: { fiches: [FICHE] } });
  coursAPI.getCours.mockResolvedValue({ data: { cours: COURS } });
});

const ouvrirFiche = async (user) => {
  await user.click(await screen.findByRole("button", { name: /ouvrir/i }));
};

describe("Page Fiches", () => {
  test("liste les fiches de l'étudiant", async () => {
    rendreAvecRouteur(<Fiches />);
    expect(await screen.findByText("Fiche - Réseaux")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /télécharger la fiche fiche - réseaux/i })).toBeInTheDocument();
  });

  test("affiche une erreur si le chargement échoue", async () => {
    fichesAPI.getFiches.mockRejectedValue(new Error("réseau"));
    rendreAvecRouteur(<Fiches />);
    expect(await screen.findByText(/impossible de charger les données/i)).toBeInTheDocument();
  });

  test("ouvre le détail d'une fiche avec son résumé", async () => {
    rendreAvecRouteur(<Fiches />);
    const user = userEvent.setup();
    await ouvrirFiche(user);
    expect(screen.getByText("SSH remplace Telnet grâce au chiffrement.")).toBeInTheDocument();
  });

  test("révise les flashcards : carte due d'abord, note envoyée avec le bon index", async () => {
    fichesAPI.mettreAJourFlashcard.mockResolvedValue({});
    rendreAvecRouteur(<Fiches />);
    const user = userEvent.setup();
    await ouvrirFiche(user);
    await user.click(screen.getAllByRole("button", { name: /flashcards|réviser/i })[0]);

    // « Que remplace SSH ? » n'a jamais été révisée : elle passe avant celle prévue demain
    const carte = screen.getByRole("button", { expanded: false });
    expect(carte).toHaveTextContent("Que remplace SSH ?");
    await user.click(carte);
    expect(screen.getByText("Telnet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /facile/i }));
    await waitFor(() => expect(fichesAPI.mettreAJourFlashcard).toHaveBeenCalledWith(4, 1, { grade: 5 }));
  });

  test("choisir un cours remplit le contenu et le titre", async () => {
    rendreAvecRouteur(<Fiches />);
    const user = userEvent.setup();
    await screen.findByText("Fiche - Réseaux");
    await user.click(screen.getAllByRole("button", { name: /générer|nouvelle fiche|créer/i })[0]);

    await user.selectOptions(screen.getByLabelText(/cours source/i), "3");
    expect(screen.getByLabelText(/texte du cours/i)).toHaveValue(COURS[0].contenu);
    expect(screen.getByLabelText(/titre de la fiche/i)).toHaveValue("Fiche - Services réseaux");
  });

  test("lance la génération à partir du texte collé", async () => {
    iaAPI.genererFicheStream.mockReturnValue({ abort: vi.fn() });
    rendreAvecRouteur(<Fiches />);
    const user = userEvent.setup();
    await screen.findByText("Fiche - Réseaux");
    await user.click(screen.getAllByRole("button", { name: /générer|nouvelle fiche|créer/i })[0]);
    await user.type(screen.getByLabelText(/texte du cours/i), "Le modèle OSI a 7 couches.");
    const boutons = screen.getAllByRole("button", { name: /générer/i });
    await user.click(boutons.at(-1));
    await waitFor(() => expect(iaAPI.genererFicheStream).toHaveBeenCalled());
    expect(iaAPI.genererFicheStream.mock.calls[0][0]).toMatchObject({ contenuCours: "Le modèle OSI a 7 couches." });
  });

  test("supprime une fiche après confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fichesAPI.supprimerFiche.mockResolvedValue({});
    rendreAvecRouteur(<Fiches />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /supprimer la fiche fiche - réseaux/i }));
    await waitFor(() => expect(fichesAPI.supprimerFiche).toHaveBeenCalledWith(4));
    await waitFor(() => expect(screen.queryByText("Fiche - Réseaux")).not.toBeInTheDocument());
  });

  test("partager rend la fiche publique", async () => {
    fichesAPI.modifierFiche.mockResolvedValue({});
    rendreAvecRouteur(<Fiches />);
    const user = userEvent.setup();
    await ouvrirFiche(user);
    await user.click(screen.getByRole("button", { name: /^partager$/i }));
    await waitFor(() => expect(fichesAPI.modifierFiche).toHaveBeenCalledWith(4, { estPublique: true }));
    expect(await screen.findByRole("button", { name: /partagée/i })).toBeInTheDocument();
  });
});
