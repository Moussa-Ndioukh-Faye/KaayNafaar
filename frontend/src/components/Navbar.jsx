import { useLocation, Link } from "react-router-dom";
import { Menu, Sun, Moon, User } from "lucide-react";
import { useAuth, useDarkMode } from "../App";
import { Button } from "./ui/button";
import { LogoMarque } from "./marque/Logo";

const titresPages = {
  "/": "Tableau de bord",
  "/mes-cours": "Mes cours",
  "/carnets": "Carnets",
  "/fiches": "Fiches de révision",
  "/quiz": "Quiz",
  "/planning": "Planning",
  "/assistant": "Assistant IA",
  "/bibliotheque": "Bibliothèque",
  "/analytiques": "Progression",
  "/profil": "Mon profil",
};

export default function Navbar({ ouvrir }) {
  const location = useLocation();
  const { utilisateur } = useAuth();
  const { darkMode, setDarkMode } = useDarkMode();
  const titre = titresPages[location.pathname] || (location.pathname.startsWith("/carnets/") ? "Carnet" : "");

  return (
    <header className="barre-verre border-b border-border/70 px-4 md:px-10 h-16 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={ouvrir}
          aria-label="Ouvrir le menu"
          className="md:hidden rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group md:hidden" aria-label="Tableau de bord">
             <LogoMarque className="w-9 h-9" />
          </Link>
          
          {titre && (
            <div className="hidden md:block">
              {/* Titre de page (h1), sauf sur le tableau de bord qui a sa propre salutation */}
              {location.pathname === "/" ? (
                <p className="text-[1.0625rem] font-semibold text-foreground leading-none">{titre}</p>
              ) : (
                <h1 className="text-[1.0625rem] font-semibold text-foreground leading-none">{titre}</h1>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          aria-label={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
          className="w-10 h-10"
        >
          {darkMode ? <Sun className="w-5 h-5 text-etoile" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
        </Button>
        
        <div className="h-6 w-px bg-border" aria-hidden="true" />

        <Link
           to="/profil"
           className="flex items-center gap-3 pl-2 cursor-pointer group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
               {utilisateur?.nom?.split(" ")[0]}
            </span>
            <span className="text-xs text-muted-foreground">Compte étudiant</span>
          </span>
          <span className="sr-only">Mon profil</span>
          <span className="w-10 h-10 rounded-full bg-gradient-to-b from-[#3d7bff] to-[#0047db] flex items-center justify-center text-sm font-semibold text-white">
            {utilisateur?.nom?.charAt(0)?.toUpperCase() || <User className="w-5 h-5" aria-hidden="true" />}
          </span>
        </Link>
      </div>
    </header>
  );
}
