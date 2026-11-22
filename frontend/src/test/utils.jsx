import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

/**
 * Affiche un composant dans un routeur en mémoire.
 * `autresRoutes` permet de vérifier une redirection (ex. { "/": "Accueil" }).
 */
export function rendreAvecRouteur(ui, { route = "/", chemin = "*", autresRoutes = {} } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={chemin} element={ui} />
        {Object.entries(autresRoutes).map(([path, texte]) => (
          <Route key={path} path={path} element={<p>{texte}</p>} />
        ))}
      </Routes>
    </MemoryRouter>
  );
}

/** Erreur Axios simulée */
export const erreurAxios = (status, data = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });
