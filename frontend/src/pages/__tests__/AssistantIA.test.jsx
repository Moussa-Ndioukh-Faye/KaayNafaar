import { screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur } from "../../test/utils";

vi.mock("../../services/api", () => ({
  iaAPI: { chatStream: vi.fn(), expliquerStream: vi.fn() },
  coursAPI: { getCours: vi.fn() },
  feedbackAPI: { envoyer: vi.fn(), envoyerFeedback: vi.fn() },
}));

import { iaAPI, coursAPI } from "../../services/api";
import AssistantIA from "../AssistantIA";

const COURS = [{ id: 3, titre: "Services réseaux", contenu: "SSH chiffre les échanges." }];

// Capture les callbacks du flux pour simuler la réponse de l'IA
let flux;
beforeEach(() => {
  coursAPI.getCours.mockResolvedValue({ data: { cours: COURS } });
  const simuler = (params, onDelta, onFin, onErreur) => {
    flux = { params, onDelta, onFin, onErreur };
    return { abort: vi.fn() };
  };
  iaAPI.chatStream.mockImplementation(simuler);
  iaAPI.expliquerStream.mockImplementation(simuler);
});

const champChat = () => screen.getByPlaceholderText(/pose ta question/i);

describe("Assistant IA", () => {
  test("envoie la question avec le contexte du cours choisi et affiche la réponse en direct", async () => {
    rendreAvecRouteur(<AssistantIA />);
    const user = userEvent.setup();
    await screen.findByRole("option", { name: "Services réseaux" });
    await user.selectOptions(screen.getByRole("combobox"), "3");

    await user.type(champChat(), "C'est quoi SSH ?{Enter}");
    await waitFor(() => expect(iaAPI.chatStream).toHaveBeenCalledTimes(1));
    expect(flux.params.contexte).toBe("SSH chiffre les échanges.");
    expect(flux.params.messages.at(-1)).toEqual({ role: "user", content: "C'est quoi SSH ?" });
    expect(screen.getByText("C'est quoi SSH ?")).toBeInTheDocument();

    act(() => {
      flux.onDelta("SSH est un protocole ");
      flux.onDelta("sécurisé.");
      flux.onFin({ sources: [{ titre: "Services réseaux" }] });
    });
    expect(await screen.findByText(/SSH est un protocole sécurisé\./)).toBeInTheDocument();
    expect(screen.getByText(/sources utilisées/i)).toBeInTheDocument();
  });

  test("une suggestion remplit le champ de saisie", async () => {
    rendreAvecRouteur(<AssistantIA />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /récursivité/i }));
    expect(champChat()).toHaveValue("Comment fonctionne la récursivité ?");
  });

  test("affiche un message d'erreur si l'IA échoue", async () => {
    rendreAvecRouteur(<AssistantIA />);
    const user = userEvent.setup();
    await user.type(champChat(), "Bonjour{Enter}");
    await waitFor(() => expect(iaAPI.chatStream).toHaveBeenCalled());
    act(() => flux.onErreur("Limite d'appels IA atteinte."));
    expect(await screen.findByText("Limite d'appels IA atteinte.")).toBeInTheDocument();
    expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument();
  });

  test("le mode « Expliquer » appelle l'explication de concept", async () => {
    rendreAvecRouteur(<AssistantIA />);
    const user = userEvent.setup();
    await user.click(within(screen.getByRole("group", { name: /mode/i })).getByRole("button", { name: /expliquer/i }));
    await user.type(screen.getByPlaceholderText(/quel concept/i), "Récursivité");
    await user.click(screen.getAllByRole("button", { name: /^expliquer$/i }).at(-1));
    await waitFor(() => expect(iaAPI.expliquerStream).toHaveBeenCalled());
    expect(flux.params).toMatchObject({ concept: "Récursivité" });
    expect(screen.getByText("Explique-moi : Récursivité")).toBeInTheDocument();
  });

  test("effacer la conversation après confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    rendreAvecRouteur(<AssistantIA />);
    const user = userEvent.setup();
    await user.type(champChat(), "Bonjour{Enter}");
    act(() => {
      flux.onDelta("Salut !");
      flux.onFin({});
    });
    await user.click(screen.getByRole("button", { name: /effacer la conversation/i }));
    expect(screen.queryByText("Bonjour")).not.toBeInTheDocument();
    expect(screen.getByText(/conversation réinitialisée/i)).toBeInTheDocument();
  });

  test("refuse un message de plus de 5000 caractères", async () => {
    rendreAvecRouteur(<AssistantIA />);
    // maxLength du champ empêche la saisie au-delà : on vérifie la limite côté interface
    expect(champChat()).toHaveAttribute("maxLength", "5000");
  });
});
