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
import { Toaster } from "./components/ui/toaster";
import { authAPI } from "./services/api";

const Home = lazy(() => import("./pages/Home"));
const MesCours = lazy(() => import("./pages/MesCours"));
const Fiches = lazy(() => import("./pages/Fiches"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Planning = lazy(() => import("./pages/Planning"));
const AssistantIA = lazy(() => import("./pages/AssistantIA"));
const Bibliotheque = lazy(() => import("./pages/Bibliotheque"));
const Connexion = lazy(() => import("./pages/Connexion"));
const Inscription = lazy(() => import("./pages/Inscription"));
const Profil = lazy(() => import("./pages/Profil"));
const Analytiques = lazy(() => import("./pages/Analytiques"));
const Page404 = lazy(() => import("./pages/Page404"));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Erreur de rendu:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Une erreur est survenue</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Veuillez rafraîchir la page ou réessayer plus tard.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors">
              Rafraîchir
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
export const useDarkMode = () => {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error("useDarkMode doit être dans DarkModeProvider");
  return ctx;
};

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

  // Restauration de session au démarrage
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const userStr = localStorage.getItem("utilisateur");
        if (!userStr) throw new Error("Pas d'utilisateur stocké");

        const user = JSON.parse(userStr);
        setUtilisateur(user); // UI réactive immédiatement

        // Vérification avec le backend (indispensable pour les cookies httpOnly)
        const profil = await authAPI.getProfil();
        
        if (active) {
          setUtilisateur(profil.data.utilisateur);
          localStorage.setItem("utilisateur", JSON.stringify(profil.data.utilisateur));
        }
      } catch (err) {
        if (active) {
          // Session expirée — redirection silencieuse
          localStorage.removeItem("utilisateur");
          setUtilisateur(null);
        }
      } finally {
        if (active) setChargement(false);
      }
    };
    restore();
    return () => { active = false; };
  }, []);

  const connecter = (_token, user) => {
    localStorage.setItem("utilisateur", JSON.stringify(user));
    setUtilisateur(user);
  };

  const deconnecter = async () => {
    try {
      await authAPI.logout();
    } catch (_) {}
    localStorage.removeItem("utilisateur");
    setUtilisateur(null);
    window.location.href = "/connexion";
  };

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      <AuthContext.Provider value={{ utilisateur, connecter, deconnecter, chargement }}>
        {children}
        <Toaster />
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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <Sidebar
        ouverte={sidebarOuverte}
        fermer={() => setSidebarOuverte(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar ouvrir={() => setSidebarOuverte(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// Application principale
// ═══════════════════════════════════════════════
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>}>
    {children}
  </Suspense>
);

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
          {/* Pages publiques */}
          <Route path="/connexion" element={<SuspenseWrapper><Connexion /></SuspenseWrapper>} />
          <Route path="/inscription" element={<SuspenseWrapper><Inscription /></SuspenseWrapper>} />

          {/* Pages protégées */}
          <Route path="/" element={<RouteProtegee><Layout><SuspenseWrapper><Home /></SuspenseWrapper></Layout></RouteProtegee>} />
          <Route path="/mes-cours" element={<RouteProtegee><Layout><SuspenseWrapper><MesCours /></SuspenseWrapper></Layout></RouteProtegee>} />
          <Route path="/fiches" element={<RouteProtegee><Layout><SuspenseWrapper><Fiches /></SuspenseWrapper></Layout></RouteProtegee>} />
          <Route path="/quiz" element={<RouteProtegee><Layout><SuspenseWrapper><Quiz /></SuspenseWrapper></Layout></RouteProtegee>} />
          <Route path="/planning" element={<RouteProtegee><Layout><SuspenseWrapper><Planning /></SuspenseWrapper></Layout></RouteProtegee>} />
          <Route path="/assistant" element={<RouteProtegee><Layout><SuspenseWrapper><AssistantIA /></SuspenseWrapper></Layout></RouteProtegee>} />
          <Route path="/bibliotheque" element={<RouteProtegee><Layout><SuspenseWrapper><Bibliotheque /></SuspenseWrapper></Layout></RouteProtegee>} />
          <Route path="/profil" element={<RouteProtegee><Layout><SuspenseWrapper><Profil /></SuspenseWrapper></Layout></RouteProtegee>} />
<Route path="/analytiques" element={<RouteProtegee><Layout><SuspenseWrapper><Analytiques /></SuspenseWrapper></Layout></RouteProtegee>} />

          {/* 404 */}
          <Route path="*" element={<SuspenseWrapper><Page404 /></SuspenseWrapper>} />
        </Routes>
      </Router>
      </ErrorBoundary>
    </AuthProvider>
  );
}
