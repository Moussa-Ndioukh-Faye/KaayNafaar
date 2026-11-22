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
import BandeauHorsLigne from "./components/BandeauHorsLigne";
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
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const Presentation = lazy(() => import("./pages/Presentation"));
const VerifierEmail = lazy(() => import("./pages/VerifierEmail"));
const MotDePasseOublie = lazy(() => import("./pages/MotDePasseOublie"));
const ReinitialiserMotDePasse = lazy(() => import("./pages/ReinitialiserMotDePasse"));
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
        <div className="flex items-center justify-center h-screen bg-background p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full border border-border bg-card rounded-2xl flex items-center justify-center mx-auto mb-4">
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

  // Restauration de session au démarrage : le serveur lit le cookie httpOnly.
  // Aucune donnée personnelle n'est gardée dans le navigateur (ordinateurs partagés, cybercafés).
  useEffect(() => {
    let active = true;
    authAPI
      .getProfil({ silencieux: true })
      .then(({ data }) => {
        if (active) setUtilisateur(data.utilisateur);
      })
      .catch(() => {
        if (active) setUtilisateur(null);
      })
      .finally(() => {
        if (active) setChargement(false);
      });
    // Nettoyage des anciennes versions qui stockaient le profil et le jeton
    try {
      localStorage.removeItem("utilisateur");
      sessionStorage.removeItem("jwt_token");
    } catch (_) {
      /* stockage indisponible */
    }
    return () => {
      active = false;
    };
  }, []);

  const connecter = (user) => setUtilisateur(user);

  const deconnecter = async () => {
    try {
      await authAPI.logout();
    } catch (_) {
      /* déjà déconnecté */
    }
    setUtilisateur(null);
    window.location.href = "/connexion";
  };

  return (
    <>
    <BandeauHorsLigne />
    <DarkModeContext.Provider value={{ darkMode, setDarkMode }}>
      <AuthContext.Provider value={{ utilisateur, connecter, deconnecter, chargement }}>
        {children}
        <Toaster />
      </AuthContext.Provider>
    </DarkModeContext.Provider>
    </>
  );
};

// ═══════════════════════════════════════════════
// Route protégée — redirige vers /connexion si non connecté
// ═══════════════════════════════════════════════
const RouteProtegee = ({ children }) => {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <div className="flex items-center justify-center h-screen"><div role="status" aria-label="Chargement" className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  return utilisateur ? children : <Navigate to="/connexion" replace />;
};

// Accueil : tableau de bord si connecté, page de présentation sinon
const Accueil = () => {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return <div className="flex items-center justify-center h-screen"><div role="status" aria-label="Chargement" className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  if (!utilisateur) return <SuspenseWrapper><Presentation /></SuspenseWrapper>;
  return <Layout><SuspenseWrapper><Home /></SuspenseWrapper></Layout>;
};

// ═══════════════════════════════════════════════
// Layout principal avec Sidebar + Navbar
// ═══════════════════════════════════════════════
const Layout = ({ children }) => {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-300">
      {/* WCAG 2.4.1 : lien d'évitement vers le contenu principal */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold"
      >
        Aller au contenu principal
      </a>
      <Sidebar
        ouverte={sidebarOuverte}
        fermer={() => setSidebarOuverte(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar ouvrir={() => setSidebarOuverte(true)} />
        {/* WCAG 2.1.1 : la zone qui défile doit être atteignable au clavier pour défiler aux flèches */}
        <main
          id="contenu"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          aria-label="Contenu de la page"
          className="flex-1 overflow-y-auto page-cahier [--marge-x:1rem] md:[--marge-x:2.5rem] pl-7 pr-4 py-6 md:pl-16 md:pr-10 md:py-8 animate-fade-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
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
  <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[60vh]"><div role="status" aria-label="Chargement" className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>}>
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
          <Route path="/confidentialite" element={<SuspenseWrapper><Confidentialite /></SuspenseWrapper>} />

          {/* Pages protégées */}
          <Route path="/" element={<Accueil />} />
          <Route path="/presentation" element={<SuspenseWrapper><Presentation /></SuspenseWrapper>} />
          <Route path="/verifier-email" element={<SuspenseWrapper><VerifierEmail /></SuspenseWrapper>} />
          <Route path="/mot-de-passe-oublie" element={<SuspenseWrapper><MotDePasseOublie /></SuspenseWrapper>} />
          <Route path="/reinitialiser-mot-de-passe" element={<SuspenseWrapper><ReinitialiserMotDePasse /></SuspenseWrapper>} />
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
