import { screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur } from "../../test/utils";

vi.mock("../../services/api", () => ({
  carnetsAPI: {
    obtenir: vi.fn(),
    modifier: vi.fn(),
    chatStream: vi.fn(),
    studio: vi.fn(),
    ajouterNote: vi.fn(),
    supprimerNote: vi.fn(),
  },
  coursAPI: { getCours: vi.fn(), importerLien: vi.fn() },
}));

import { carnetsAPI, coursAPI } from "../../services/api";
import Carnet from "../Carnet";
import LecteurPodcast from "../../components/carnet/LecteurPodcast";

const CARNET = { id: 3, titre: "Partiel réseaux", coursIds: [1], notes: [], studio: {}, sources: [{ id: 1, titre: "Services réseaux" }] };
const COURS = [
  { id: 1, titre: "Services réseaux", matiere: "Réseaux" },
  { id: 2, titre: "Bases de données", matiere: "BD" },
];

const ouvrir = () => rendreAvecRouteur(<Carnet />, { route: "/carnets/3", chemin: "/carnets/:id" });

beforeEach(() => {
  carnetsAPI.obtenir.mockResolvedValue({ data: { carnet: structuredClone(CARNET) } });
  coursAPI.getCours.mockResolvedValue({ data: { cours: COURS } });
});

describe("Carnet", () => {
  test("affiche les sources cochées et permet d'en ajouter une", async () => {
    carnetsAPI.modifier.mockResolvedValue({ data: { carnet: { ...CARNET, coursIds: [1, 2] } } });
    ouvrir();
    const reseaux = await screen.findByRole("checkbox", { name: /services réseaux/i });
    expect(reseaux).toBeChecked();
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: /bases de données/i }));
    expect(carnetsAPI.modifier).toHaveBeenCalledWith(3, { coursIds: [1, 2] });
  });

  test("la réponse cite ses sources : toucher [1] affiche le passage", async () => {
    let flux;
    carnetsAPI.chatStream.mockImplementation((id, messages, rappels) => {
      flux = rappels;
      return { abort: vi.fn() };
    });
    ouvrir();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/ta question/i), "Quel port pour SSH ?{Enter}");
    expect(carnetsAPI.chatStream).toHaveBeenCalledWith(3, [{ role: "user", content: "Quel port pour SSH ?" }], expect.any(Object));

    act(() => {
      flux.onPassages([{ n: 1, coursId: 1, titre: "Services réseaux", texte: "Par défaut, SSH écoute sur le port 22." }]);
      flux.onDelta("SSH utilise le port **22** [1].");
      flux.onDone({ done: true });
    });

    await user.click(await screen.findByRole("button", { name: /source 1 : services réseaux/i }));
    expect(screen.getByText("Par défaut, SSH écoute sur le port 22.")).toBeInTheDocument();
  });

  test("le studio génère une carte mentale puis l'affiche", async () => {
    carnetsAPI.studio.mockResolvedValue({
      data: {
        production: {
          contenu: { centre: "SSH", branches: [{ titre: "Sécurité", enfants: [{ titre: "Chiffrement", enfants: [] }] }] },
          genereLe: "2026-11-22",
        },
      },
    });
    ouvrir();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /carte mentale/i }));
    expect(carnetsAPI.studio).toHaveBeenCalledWith(3, "carte_mentale");
    expect(await screen.findByText("Chiffrement")).toBeInTheDocument();
    expect(screen.getByText("Sécurité")).toBeInTheDocument();
  });

  test("carnet introuvable", async () => {
    carnetsAPI.obtenir.mockRejectedValue(Object.assign(new Error("404"), { response: { status: 404 } }));
    ouvrir();
    expect(await screen.findByRole("alert")).toHaveTextContent(/n'existe pas/i);
  });
});

describe("Résumé audio", () => {
  const repliques = [
    { voix: "Awa", texte: "Aujourd'hui, on parle de SSH." },
    { voix: "Moussa", texte: "SSH chiffre les échanges." },
  ];

  afterEach(() => {
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  test("lit les répliques l'une après l'autre avec la synthèse vocale", async () => {
    const dits = [];
    window.SpeechSynthesisUtterance = function (texte) {
      this.text = texte;
    };
    window.speechSynthesis = {
      getVoices: () => [
        { name: "Amélie", lang: "fr-CA" },
        { name: "Thomas", lang: "fr-FR" },
      ],
      speak: vi.fn((u) => dits.push(u)),
      cancel: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    rendreAvecRouteur(<LecteurPodcast titre="SSH" repliques={repliques} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /écouter/i }));

    expect(dits[0].text).toBe("Aujourd'hui, on parle de SSH.");
    expect(dits[0].voice.name).toBe("Amélie");
    act(() => dits[0].onend());
    expect(dits[1].text).toBe("SSH chiffre les échanges.");
    expect(dits[1].voice.name).toBe("Thomas");
    const lignes = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(lignes[1]).toHaveAttribute("aria-current", "true");
  });

  test("sans synthèse vocale, le texte reste lisible", () => {
    rendreAvecRouteur(<LecteurPodcast titre="SSH" repliques={repliques} />);
    expect(screen.getByText(/pas disponible sur ce navigateur/i)).toBeInTheDocument();
    expect(screen.getByText("SSH chiffre les échanges.")).toBeInTheDocument();
  });
});

describe("Liste des carnets", () => {
  test("crée un carnet avec les cours choisis", async () => {
    const { carnetsAPI: api } = await import("../../services/api");
    api.lister = vi.fn().mockResolvedValue({ data: { carnets: [] } });
    api.creer = vi.fn().mockResolvedValue({ data: { carnet: { id: 9, titre: "Bac", coursIds: [2] } } });
    const { default: Carnets } = await import("../Carnets");
    rendreAvecRouteur(<Carnets />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /nouveau carnet/i }));
    await user.type(screen.getByLabelText(/titre du carnet/i), "Bac");
    await user.click(screen.getByRole("checkbox", { name: /bases de données/i }));
    await user.click(screen.getByRole("button", { name: /créer le carnet/i }));
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith({ titre: "Bac", coursIds: [2] }));
    expect(await screen.findByRole("link", { name: "Bac" })).toHaveAttribute("href", "/carnets/9");
  });
});
