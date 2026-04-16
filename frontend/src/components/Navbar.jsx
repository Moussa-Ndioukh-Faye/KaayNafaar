/**
 * Navbar — Barre de navigation supérieure
 */

import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth, useDarkMode } from "../App";

const titresPages = {
  "/": "Tableau de bord",
  "/mes-cours": "Mes Cours",
  "/fiches": "Fiches de révision",
  "/quiz": "Quiz & Évaluation",
  "/planning": "Mon Planning",
  "/assistant": "Assistant IA",
  "/profil": "Mon Profil",
};

export default function Navbar({ ouvrir }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const { darkMode, setDarkMode } = useDarkMode();
  const titre = titresPages[location.pathname] || "";

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      {/* Logo + Menu hamburger */}
      <div className="flex items-center gap-4">
        <button
          onClick={ouvrir}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Ouvrir le menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Logo Kay Nafar avec animation */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold gradient-text leading-tight">Kay Nafar</h1>
            <p className="text-xs text-gray-400 -mt-1">Assistant d'études</p>
          </div>
        </Link>

        {/* Titre de la page */}
        {titre && (
          <div className="hidden md:block h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
        )}
        {titre && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{titre}</h1>
        )}
      </div>

      {/* Droite : salutation + dark mode */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={darkMode ? "Mode clair" : "Mode sombre"}
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
          Bonjour, <span className="font-medium text-gray-900 dark:text-gray-100">{utilisateur?.nom?.split(" ")[0] || "Étudiant"}</span> 👋
        </span>
        <button onClick={() => navigate("/profil")} className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold hover:bg-primary-700">
          {utilisateur?.nom?.charAt(0)?.toUpperCase() || "E"}
        </button>
      </div>
    </header>
  );
}
