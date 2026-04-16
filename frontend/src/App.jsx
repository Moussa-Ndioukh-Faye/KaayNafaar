/**
 * App.jsx — Point d'entrée React
 * Gestion des routes, authentification, layout global
 */

import React, { createContext, useContext, useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import MesCours from "./pages/MesCours";
import Fiches from "./pages/Fiches";
import Quiz from "./pages/Quiz";
import Planning from "./pages/Planning";
import AssistantIA from "./pages/AssistantIA";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import Profil from "./pages/Profil";

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (event) => {
      setHasError(true);
      console.error("Erreur non gérée:", event.error);
    };
    window.addEventListener("error", errorHandler);
    return () => window.removeEventListener("error", errorHandler);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Une erreur est survenue</h1>
          <p className="text-gray-600 mb-4">Veuillez rafraîchir la page.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Rafraîchir</button>
        </div>
      </div>
    );
  }
  return children;
};

// ═══════════════════════════════════════════════
// Contexte d'authentification global
// ═══════════════════════════════════════════════
export const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être dans AuthProvider");
  return ctx;
};

const DarkModeContext = createContext(null);
export const useDarkMode = () => useContext(DarkModeContext);

const AuthProvider = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const restore = async () => {
      try {
        const userStr = localStorage.getItem("utilisateur");
        const user = userStr ? JSON.parse(userStr) : null;

        if (!user || !user._id) {
          throw new Error("Session invalide");
        }

        setUtilisateur(user);

        const profil = await import("./services/api").then(({ authAPI }) => authAPI.getProfil());
        if (profil.data.utilisateur._id !== user._id) {
          throw new Error("Session corrompue");
        }

        setUtilisateur(profil.data.utilisateur);
      } catch (err) {
        localStorage.removeItem("utilisateur");
        setUtilisateur(null);
      } finally {
        setChargement(false);
      }
    };
    restore();
  }, []);

  const connecter = (_token, user) => {
    // le token est ignoré : il est déjà stocké en cookie par le backend
    localStorage.setItem("utilisateur", JSON.stringify(user));
    setUtilisateur(user);
  };

  const deconnecter = async () => {
    try {
      await import("./services/api").then(({ authAPI }) => authAPI.logout());
    } catch (err) {
      // erreur de réseau, on continue quand même
    }
    localStorage.removeItem("utilisateur");
    setUtilisateur(null);
  };

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      <AuthContext.Provider value={{ utilisateur, connecter, deconnecter, chargement }}>
        {children}
      </AuthContext.Provider>
    </DarkModeContext.Provider>
  );
};

// ═══════════════════════════════════════════════
// Route protégée — redirige vers /connexion si non connecté
// ═══════════════════════════════════════════════
const RouteProtegee = ({ children }) => {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  return utilisateur ? children : <Navigate to="/connexion" replace />;
};

// ═══════════════════════════════════════════════
// Layout principal avec Sidebar + Navbar
// ═══════════════════════════════════════════════
const Layout = ({ children }) => {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        ouverte={sidebarOuverte}
        fermer={() => setSidebarOuverte(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar ouvrir={() => setSidebarOuverte(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Application principale
// ═══════════════════════════════════════════════
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Pages publiques */}
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />

          {/* Pages protégées */}
          <Route
            path="/"
            element={
              <RouteProtegee>
                <Layout><Home /></Layout>
              </RouteProtegee>
            }
          />
          <Route
            path="/mes-cours"
            element={
              <RouteProtegee>
                <Layout><MesCours /></Layout>
              </RouteProtegee>
            }
          />
          <Route
            path="/fiches"
            element={
              <RouteProtegee>
                <Layout><Fiches /></Layout>
              </RouteProtegee>
            }
          />
          <Route
            path="/quiz"
            element={
              <RouteProtegee>
                <Layout><Quiz /></Layout>
              </RouteProtegee>
            }
          />
          <Route
            path="/planning"
            element={
              <RouteProtegee>
                <Layout><Planning /></Layout>
              </RouteProtegee>
            }
          />
          <Route
            path="/assistant"
            element={
              <RouteProtegee>
                <Layout><AssistantIA /></Layout>
              </RouteProtegee>
            }
          />
          <Route
            path="/profil"
            element={
              <RouteProtegee>
                <Layout><Profil /></Layout>
              </RouteProtegee>
            }
          />

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
