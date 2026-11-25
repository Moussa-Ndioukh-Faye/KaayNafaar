import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("../../../services/api", () => ({
  authAPI: { sessions: vi.fn(), fermerSession: vi.fn(), fermerAutresSessions: vi.fn() },
}));

import { authAPI } from "../../../services/api";
import AppareilsConnectes, { depuis } from "../AppareilsConnectes";

const il_y_a = (min) => new Date(Date.now() - min * 60 * 1000).toISOString();
const SESSIONS = [
  { id: "a", appareil: "Safari sur iPhone", typeAppareil: "telephone", ipTronquee: "41.82.15.x", derniereActivite: il_y_a(0), actuelle: true },
  { id: "b", appareil: "Chrome sur Windows", typeAppareil: "ordinateur", ipTronquee: "196.207.1.x", derniereActivite: il_y_a(120), actuelle: false },
  { id: "c", appareil: "Firefox sur Linux", typeAppareil: "ordinateur", ipTronquee: null, derniereActivite: il_y_a(60 * 30), actuelle: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  authAPI.sessions.mockResolvedValue({ data: { sessions: structuredClone(SESSIONS) } });
});

describe("Appareils connectés", () => {
  test("liste les appareils et signale celui en cours, sans bouton pour lui", async () => {
    render(<AppareilsConnectes />);
    expect(await screen.findByText("Safari sur iPhone")).toBeInTheDocument();
    expect(screen.getByText("Cet appareil")).toBeInTheDocument();
    expect(screen.getByText(/il y a 2 heures/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /déconnecter safari sur iphone/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /déconnecter chrome sur windows/i })).toBeInTheDocument();
  });

  test("déconnecte un appareil à distance et l'annonce aux lecteurs d'écran", async () => {
    authAPI.fermerSession.mockResolvedValue({ data: { success: true } });
    render(<AppareilsConnectes />);
    await userEvent.click(await screen.findByRole("button", { name: /déconnecter chrome sur windows/i }));
    expect(authAPI.fermerSession).toHaveBeenCalledWith("b");
    await waitFor(() => expect(screen.queryByText("Chrome sur Windows", { selector: "p" })).not.toBeInTheDocument());
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(/chrome sur windows a été déconnecté/i);
  });

  test("« déconnecter les autres » demande une confirmation avant d'agir", async () => {
    authAPI.fermerAutresSessions.mockResolvedValue({ data: { message: "2 appareils déconnectés." } });
    render(<AppareilsConnectes />);
    const bouton = await screen.findByRole("button", { name: /déconnecter les autres appareils/i });
    await userEvent.click(bouton);
    expect(authAPI.fermerAutresSessions).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /confirmer : déconnecter 2 appareils/i }));
    expect(authAPI.fermerAutresSessions).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Firefox sur Linux")).not.toBeInTheDocument());
    expect(screen.getByText("Safari sur iPhone")).toBeInTheDocument();
  });

  test("affiche une erreur et permet de réessayer", async () => {
    authAPI.sessions.mockRejectedValueOnce({ response: { data: { message: "Serveur indisponible." } } });
    render(<AppareilsConnectes />);
    expect(await screen.findByText("Serveur indisponible.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Safari sur iPhone")).toBeInTheDocument();
  });

  test("formule les durées en français", () => {
    const t = Date.now();
    expect(depuis(new Date(t - 20 * 1000), t)).toBe("à l'instant");
    expect(depuis(new Date(t - 5 * 60 * 1000), t)).toBe("il y a 5 minutes");
    expect(depuis(new Date(t - 26 * 3600 * 1000), t)).toBe("hier");
  });
});
