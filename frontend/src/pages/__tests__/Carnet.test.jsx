import { screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur } from "../../test/utils";

vi.mock("../../services/api", () => ({
  carnetsAPI: {
    obtenir: vi.fn(),
    modifier: vi.fn(),
    reglages: vi.fn(),
    guide: vi.fn(),
    messages: vi.fn(),
    effacerMessages: vi.fn(),
    chatStream: vi.fn(),
    studio: vi.fn(),
    supprimerProduction: vi.fn(),
    exporterProduction: vi.fn(),
    intervention: vi.fn(),
    decouvrir: vi.fn(),
    ajouterSourcesWeb: vi.fn(),
    ajouterNote: vi.fn(),
    supprimerNote: vi.fn(),
    noteEnSource: vi.fn(),
  },
  coursAPI: { getCours: vi.fn(), importerLien: vi.fn() },
}));

import { carnetsAPI, coursAPI } from "../../services/api";
import Carnet from "../Carnet";
import LecteurPodcast from "../../components/carnet/LecteurPodcast";
import { QuizPratique, CartesRevision } from "../../components/carnet/ProductionStudio";

const REGLAGES = { style: "defaut", longueur: "normale", consignes: "", langue: "fr" };
const CARNET = {
  id: 3,
  titre: "Partiel réseaux",
  coursIds: [1, 2],
  notes: [],
  productions: [],
  reglages: REGLAGES,
  sources: [
    { id: 1, titre: "Services réseaux", matiere: "Réseaux" },
    { id: 2, titre: "Bases de données", matiere: "BD" },
  ],
};
const COURS = [...CARNET.sources, { id: 4, titre: "Systèmes", matiere: "OS" }];
const GUIDE = {
  resume: "Ces cours couvrent l'accès distant sécurisé et la normalisation.",
  sujets: [{ titre: "SSH", description: "Accès distant chiffré" }],
  questions: ["Pourquoi SSH remplace-t-il Telnet ?"],
  sources: [
    { id: 1, titre: "Services réseaux", resume: "SSH et Telnet.", sujets: ["SSH"], statut: "pret" },
    { id: 2, titre: "Bases de données", resume: null, sujets: [], statut: "en_attente" },
  ],
  complet: true,
};

const ouvrir = () => rendreAvecRouteur(<Carnet />, { route: "/carnets/3", chemin: "/carnets/:id" });

/** Capture les gestionnaires passés à chatStream pour simuler le flux du serveur */
const fluxChat = () => {
  const etat = {};
  carnetsAPI.chatStream.mockImplementation((id, corps, gestionnaires) => {
    Object.assign(etat, { id, corps, ...gestionnaires });
    return { abort: vi.fn() };
  });
  return etat;
};

beforeEach(() => {
  carnetsAPI.obtenir.mockResolvedValue({ data: { carnet: structuredClone(CARNET) } });
  carnetsAPI.guide.mockResolvedValue({ data: { guide: structuredClone(GUIDE) } });
  carnetsAPI.messages.mockResolvedValue({ data: { messages: [] } });
  coursAPI.getCours.mockResolvedValue({ data: { cours: COURS } });
});

describe("Carnet", () => {
  test("le guide résume les sources ; toucher une question la pose au carnet", async () => {
    const flux = fluxChat();
    ouvrir();
    expect(await screen.findByText(/accès distant sécurisé et la normalisation/)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Pourquoi SSH remplace-t-il Telnet ?" }));
    expect(flux.corps).toEqual({ question: "Pourquoi SSH remplace-t-il Telnet ?", coursIds: [1, 2] });
  });

  test("décocher une source la retire des réponses (sans la retirer du carnet)", async () => {
    const flux = fluxChat();
    ouvrir();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("checkbox", { name: "Bases de données" }));
    await user.type(screen.getByLabelText(/ta question/i), "Et SSH ?{Enter}");
    expect(flux.corps.coursIds).toEqual([1]);
    expect(carnetsAPI.modifier).not.toHaveBeenCalled();
  });

  test("la réponse cite ses sources (page comprise) et propose des relances", async () => {
    const flux = fluxChat();
    ouvrir();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/ta question/i), "Quel port pour SSH ?{Enter}");
    act(() => {
      flux.onPassages([{ n: 1, coursId: 1, titre: "Services réseaux", page: "p. 4", texte: "Par défaut, SSH écoute sur le port 22." }]);
      flux.onDelta("SSH utilise le port **22** [1].");
      flux.onSuivi(["Et Telnet ?"]);
      flux.onDone({ done: true });
    });
    await user.click(await screen.findByRole("button", { name: /source 1 : services réseaux/i }));
    const fenetre = screen.getByRole("dialog");
    expect(within(fenetre).getByText("Par défaut, SSH écoute sur le port 22.")).toBeInTheDocument();
    expect(within(fenetre).getByText(/p\. 4/)).toBeInTheDocument();
    await user.click(within(fenetre).getByRole("button", { name: "Fermer" }));

    await user.click(screen.getByRole("button", { name: "Et Telnet ?" }));
    expect(flux.corps.question).toBe("Et Telnet ?");
  });

  test("l'historique de la conversation est rechargé", async () => {
    carnetsAPI.messages.mockResolvedValue({
      data: {
        messages: [
          { role: "user", contenu: "Port SSH ?", passages: [] },
          { role: "assistant", contenu: "Le port 22 [1].", passages: [{ n: 1, titre: "Services réseaux", texte: "port 22" }], suivi: [] },
        ],
      },
    });
    ouvrir();
    expect(await screen.findByText("Port SSH ?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /source 1 : services réseaux/i })).toBeInTheDocument();
  });

  test("réglages des réponses : style et consignes enregistrés", async () => {
    carnetsAPI.reglages.mockResolvedValue({ data: { reglages: { ...REGLAGES, style: "examen", consignes: "Tutoie-moi." } } });
    ouvrir();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /réglages des réponses/i }));
    await user.click(screen.getByRole("radio", { name: /préparation d'examen/i }));
    await user.type(screen.getByLabelText(/consignes personnelles/i), "Tutoie-moi.");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(carnetsAPI.reglages).toHaveBeenCalledWith(3, { ...REGLAGES, style: "examen", consignes: "Tutoie-moi." });
    expect(await screen.findByRole("button", { name: /réglages des réponses : préparation d'examen/i })).toBeInTheDocument();
  });

  test("studio : options choisies, production gardée et ouverte", async () => {
    carnetsAPI.studio.mockResolvedValue({
      data: {
        production: {
          id: 11,
          type: "carte_mentale",
          titre: "SSH",
          options: { langue: "fr" },
          createdAt: "2026-11-25T10:00:00Z",
          contenu: { centre: "SSH", branches: [{ titre: "Sécurité", enfants: [{ titre: "Chiffrement", enfants: [] }] }] },
        },
      },
    });
    const flux = fluxChat();
    ouvrir();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /carte mentale/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Générer" }));
    expect(carnetsAPI.studio).toHaveBeenCalledWith(3, "carte_mentale", { consignes: "", langue: "fr" }, [1, 2]);

    // Carte mentale : toucher une notion la pose au chat
    await user.click(await screen.findByRole("button", { name: "Chiffrement" }));
    expect(flux.corps.question).toMatch(/« Chiffrement » \(dans le thème « Sécurité »\)/);
  });

  test("un rapport personnalisé exige une description avant de générer", async () => {
    ouvrir();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /^rapport/i }));
    const fenetre = screen.getByRole("dialog");
    await user.click(within(fenetre).getByRole("button", { name: "Personnalisé" }));
    expect(within(fenetre).getByRole("button", { name: "Générer" })).toBeDisabled();
    await user.type(within(fenetre).getByLabelText(/décris le document voulu/i), "Un plan de révision en 5 jours");
    await user.click(within(fenetre).getByRole("button", { name: "Générer" }));
    expect(carnetsAPI.studio).toHaveBeenCalledWith(
      3,
      "rapport",
      expect.objectContaining({ format: "personnalise", consignes: "Un plan de révision en 5 jours" }),
      [1, 2]
    );
  });

  test("ajout de sources : recherche sur le web puis import des pages choisies", async () => {
    carnetsAPI.decouvrir.mockResolvedValue({
      data: { resultats: [{ titre: "SSH expliqué", url: "https://exemple.sn/ssh", domaine: "exemple.sn", extrait: "Le protocole…" }] },
    });
    carnetsAPI.ajouterSourcesWeb.mockResolvedValue({
      data: { message: "1 source ajoutée.", echecs: [], carnet: { ...structuredClone(CARNET), coursIds: [1, 2, 7] } },
    });
    ouvrir();
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: /^ajouter$/i }))[0]);
    const fenetre = screen.getByRole("dialog");
    await user.click(within(fenetre).getByRole("button", { name: "Rechercher" }));
    await user.type(within(fenetre).getByLabelText(/sur quel sujet/i), "protocole SSH{Enter}");
    await user.click(await within(fenetre).findByRole("checkbox", { name: "SSH expliqué" }));
    await user.click(within(fenetre).getByRole("button", { name: /ajouter 1 source/i }));
    expect(carnetsAPI.ajouterSourcesWeb).toHaveBeenCalledWith(3, ["https://exemple.sn/ssh"]);
    expect(await within(fenetre).findByText("1 source ajoutée.")).toBeInTheDocument();
  });

  test("carnet introuvable", async () => {
    carnetsAPI.obtenir.mockRejectedValue(Object.assign(new Error("404"), { response: { status: 404 } }));
    ouvrir();
    expect(await screen.findByRole("alert")).toHaveTextContent(/n'existe pas/i);
  });
});

describe("Quiz et flashcards du studio", () => {
  const QUESTIONS = [
    { type: "qcm", question: "Port SSH ?", options: ["21", "22"], reponseCorrecte: "22", explication: "SSH écoute sur 22." },
    { type: "qcm", question: "Telnet chiffre ?", options: ["Oui", "Non"], reponseCorrecte: "Non", explication: "" },
  ];

  test("le quiz corrige chaque réponse et donne une note sur 20", async () => {
    rendreAvecRouteur(<QuizPratique questions={QUESTIONS} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "22" }));
    expect(screen.getByText("SSH écoute sur 22.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Oui" }));
    expect(screen.getByRole("status")).toHaveTextContent("Note : 10/20 (1 sur 2)");
  });

  test("les flashcards se retournent et comptent ce qui est su", async () => {
    rendreAvecRouteur(<CartesRevision cartes={[{ question: "Port SSH ?", reponse: "22" }, { question: "Port HTTP ?", reponse: "80" }]} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Voir la réponse" }));
    expect(screen.getByText("22")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /je savais/i }));
    expect(screen.getByText("Port HTTP ?")).toBeInTheDocument();
    expect(screen.getByText(/1 sue · 0 à revoir/)).toBeInTheDocument();
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

  test("mode interactif : la réponse à une question posée pendant l'écoute est insérée", async () => {
    const onQuestion = vi.fn().mockResolvedValue([
      { voix: "Awa", texte: "Un auditeur demande pourquoi le port 22." },
      { voix: "Moussa", texte: "C'est le port attribué à SSH." },
    ]);
    rendreAvecRouteur(<LecteurPodcast titre="SSH" repliques={repliques} onQuestion={onQuestion} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /poser une question pendant l'écoute/i }));
    await user.type(screen.getByLabelText(/ta question à awa et moussa/i), "Pourquoi le port 22 ?{Enter}");
    expect(onQuestion).toHaveBeenCalledWith("Pourquoi le port 22 ?", 0);
    expect(await screen.findByText("C'est le port attribué à SSH.")).toBeInTheDocument();
    expect(screen.getByText("Pourquoi le port 22 ?")).toBeInTheDocument(); // la question reste visible
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
