import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { rendreAvecRouteur } from "../../test/utils";

vi.mock("../../services/api", () => ({
  quizAPI: { getQuiz: vi.fn(), soumettreSession: vi.fn(), supprimerQuiz: vi.fn() },
  coursAPI: { getCours: vi.fn() },
  iaAPI: { genererQuizStream: vi.fn() },
}));

import { quizAPI, coursAPI, iaAPI } from "../../services/api";
import Quiz from "../Quiz";

const QUIZ = {
  id: 7,
  titre: "Quiz - Réseaux",
  difficulte: "moyen",
  questions: [
    { question: "Quel protocole sécurise SSH ?", type: "qcm", options: ["Telnet", "Chiffrement asymétrique", "FTP"] },
    { question: "Port par défaut de SSH ?", type: "qcm", options: ["21", "22", "80"] },
  ],
  sessions: [],
};

const COURS = [{ id: 3, titre: "Services réseaux", contenu: "SSH chiffre les échanges entre client et serveur." }];

beforeEach(() => {
  quizAPI.getQuiz.mockResolvedValue({ data: { quizList: [QUIZ] } });
  coursAPI.getCours.mockResolvedValue({ data: { cours: COURS } });
});

describe("Page Quiz", () => {
  test("liste les quiz de l'étudiant", async () => {
    rendreAvecRouteur(<Quiz />);
    expect(await screen.findByText("Quiz - Réseaux")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /commencer le quiz/i })).toBeInTheDocument();
  });

  test("affiche une erreur si le chargement échoue", async () => {
    quizAPI.getQuiz.mockRejectedValue(new Error("réseau"));
    rendreAvecRouteur(<Quiz />);
    expect(await screen.findByText(/impossible de charger les quiz/i)).toBeInTheDocument();
  });

  test("déroule un quiz et envoie les réponses dans l'ordre", async () => {
    quizAPI.soumettreSession.mockResolvedValue({
      data: {
        resultat: {
          score: 2,
          total: 2,
          pourcentage: 100,
          reponses: [
            { reponseUtilisateur: "Chiffrement asymétrique", estCorrecte: true },
            { reponseUtilisateur: "22", estCorrecte: true },
          ],
        },
      },
    });
    rendreAvecRouteur(<Quiz />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /commencer le quiz/i }));
    expect(screen.getByText("Quel protocole sécurise SSH ?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /chiffrement asymétrique/i }));
    await user.click(screen.getByRole("button", { name: /suivante/i }));

    expect(screen.getByText("Port par défaut de SSH ?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^22$/ }));
    await user.click(screen.getByRole("button", { name: /terminer/i }));

    await waitFor(() => expect(quizAPI.soumettreSession).toHaveBeenCalledTimes(1));
    const [id, corps] = quizAPI.soumettreSession.mock.calls[0];
    expect(id).toBe(7);
    expect(corps.reponses).toEqual([{ reponseUtilisateur: "Chiffrement asymétrique" }, { reponseUtilisateur: "22" }]);
    expect(await screen.findByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Félicitations !" })).toBeInTheDocument();
  });

  test("choisir un cours remplit le contenu à transformer en quiz", async () => {
    rendreAvecRouteur(<Quiz />);
    const user = userEvent.setup();
    await screen.findByText("Quiz - Réseaux");
    await user.click(screen.getAllByRole("button", { name: /générer|nouveau quiz|créer/i })[0]);

    await user.selectOptions(screen.getByLabelText(/choisir un cours/i), "3");
    expect(screen.getByLabelText(/contenu/i)).toHaveValue(COURS[0].contenu);
  });

  test("lance la génération avec les paramètres choisis", async () => {
    iaAPI.genererQuizStream.mockReturnValue({ abort: vi.fn() });
    rendreAvecRouteur(<Quiz />);
    const user = userEvent.setup();
    await screen.findByText("Quiz - Réseaux");
    await user.click(screen.getAllByRole("button", { name: /générer|nouveau quiz|créer/i })[0]);

    await user.type(screen.getByLabelText(/contenu/i), "Le protocole TCP est fiable.");
    await user.selectOptions(screen.getByLabelText(/nombre de questions/i), "10");
    await user.selectOptions(screen.getByLabelText(/difficulté/i), "difficile");
    const zone = screen.getByLabelText(/contenu/i).closest("div").parentElement.parentElement;
    await user.click(within(zone).getAllByRole("button").at(-1));

    await waitFor(() => expect(iaAPI.genererQuizStream).toHaveBeenCalled());
    const [params] = iaAPI.genererQuizStream.mock.calls[0];
    expect(params).toMatchObject({ contenuCours: "Le protocole TCP est fiable.", nombreQuestions: 10, difficulte: "difficile" });
  });

  test("supprime un quiz après confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    quizAPI.supprimerQuiz.mockResolvedValue({});
    rendreAvecRouteur(<Quiz />);
    await screen.findByText("Quiz - Réseaux");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /supprimer/i }));
    await waitFor(() => expect(quizAPI.supprimerQuiz).toHaveBeenCalledWith(7));
    await waitFor(() => expect(screen.queryByText("Quiz - Réseaux")).not.toBeInTheDocument());
  });
});
