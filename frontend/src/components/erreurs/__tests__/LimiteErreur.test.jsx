import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { LimitePage } from "../LimiteErreur";
import BandeauHorsLigne from "../BandeauHorsLigne";

const Plante = () => {
  throw new Error("boum");
};

describe("limite d'erreur par page", () => {
  test("une page qui plante affiche un écran clair, la navigation reste disponible", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={["/casse"]}>
        <Link to="/ok">Aller ailleurs</Link>
        <LimitePage>
          <Routes>
            <Route path="/casse" element={<Plante />} />
            <Route path="/ok" element={<p>Page saine</p>} />
          </Routes>
        </LimitePage>
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Cette page a rencontré un problème");
    expect(screen.getByText(/Référence/)).toBeInTheDocument();
    // Changer de page efface l'erreur
    fireEvent.click(screen.getByText("Aller ailleurs"));
    expect(screen.getByText("Page saine")).toBeInTheDocument();
  });

  test("morceau de page introuvable après un déploiement : proposition de recharger", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sessionStorage.setItem("kn-rechargement-version", String(Date.now())); // déjà rechargé : pas de boucle
    const Manquant = () => {
      throw new TypeError("Failed to fetch dynamically imported module: /assets/Carnet.js");
    };
    render(
      <MemoryRouter>
        <LimitePage>
          <Manquant />
        </LimitePage>
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Une nouvelle version est disponible");
    expect(screen.getByRole("button", { name: /Recharger/ })).toBeInTheDocument();
  });
});

test("bandeau hors ligne puis retour en ligne", () => {
  vi.useFakeTimers();
  render(<BandeauHorsLigne />);
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByRole("status")).toHaveTextContent("Hors connexion");
  act(() => window.dispatchEvent(new Event("online")));
  expect(screen.getByRole("status")).toHaveTextContent("De retour en ligne");
  act(() => vi.advanceTimersByTime(3100));
  expect(screen.queryByRole("status")).toBeNull();
  vi.useRealTimers();
});
