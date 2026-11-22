import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  BrainCircuit, 
  Calendar, 
  MessageSquare, 
  Settings,
  LogOut,
  Globe,
  BarChart3
} from "lucide-react";
import { useAuth } from "../App";
import { cn } from "../lib/utils";
import Logo from "./marque/Logo";
import { Button } from "./ui/button";
import BoutonInstaller from "./BoutonInstaller";

// Le menu est le « sommaire » du cahier : rubriques et entrées numérotées
const sommaire = [
  {
    rubrique: "Réviser",
    entrees: [
      { nom: "Tableau de bord", href: "/", icon: LayoutDashboard },
      { nom: "Mes cours", href: "/mes-cours", icon: BookOpen },
      { nom: "Fiches de révision", href: "/fiches", icon: FileText },
      { nom: "Quiz", href: "/quiz", icon: BrainCircuit },
      { nom: "Planning", href: "/planning", icon: Calendar },
    ],
  },
  {
    rubrique: "Explorer",
    entrees: [
      { nom: "Assistant IA", href: "/assistant", icon: MessageSquare },
      { nom: "Bibliothèque", href: "/bibliotheque", icon: Globe },
    ],
  },
  {
    rubrique: "Suivre",
    entrees: [
      { nom: "Progression", href: "/analytiques", icon: BarChart3 },
      { nom: "Mon profil", href: "/profil", icon: Settings },
    ],
  },
];

export default function Sidebar({ ouverte, fermer }) {
  // WCAG 2.1.2 : le menu mobile se ferme avec la touche Échap
  useEffect(() => {
    if (!ouverte) return undefined;
    const surTouche = (e) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouverte, fermer]);

  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();

  const handleDeconnexion = () => {
    deconnecter();
    navigate("/connexion");
  };

  let numero = 0;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-papier-fonce/60 dark:bg-card border-r border-border">
      <div className="px-6 pt-7 pb-5 border-b border-border">
        <Logo />
      </div>

      <nav aria-label="Navigation principale" className="flex-1 px-4 py-5 overflow-y-auto scrollbar-none">
        <p className="font-display italic text-lg text-foreground px-2 mb-3" aria-hidden="true">
          Sommaire
        </p>
        {sommaire.map(({ rubrique, entrees }) => (
          <div key={rubrique} className="mb-4">
            <p className="etiquette px-2 mb-1.5">{rubrique}</p>
            <ul>
              {entrees.map((item) => {
                const Icon = item.icon;
                numero += 1;
                const num = String(numero).padStart(2, "0");
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      onClick={fermer}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 px-2 py-2 rounded-md text-[0.95rem] transition-colors",
                          isActive
                            ? "text-foreground font-semibold"
                            : "text-foreground/75 hover:text-foreground hover:bg-foreground/[0.05]"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span aria-hidden="true" className="chiffres w-6 text-xs font-semibold text-muted-foreground">
                            {num}
                          </span>
                          <Icon
                            aria-hidden="true"
                            className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
                          />
                          <span className="flex-1">
                            <span className={cn(isActive && "surligne")}>{item.nom}</span>
                          </span>
                          {isActive && <span className="sr-only">(page actuelle)</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 pb-5 pt-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-card border border-encre/70 dark:border-foreground/40 flex items-center justify-center font-display text-lg text-primary"
          >
            {utilisateur?.nom?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{utilisateur?.nom || "Étudiant"}</p>
            <p className="text-xs text-muted-foreground truncate">{utilisateur?.email || ""}</p>
          </div>
        </div>
        <Button
          onClick={handleDeconnexion}
          variant="ghost"
          className="w-full justify-start gap-3 h-10 px-2 text-marge hover:text-marge hover:bg-marge/10"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Déconnexion
        </Button>
        <BoutonInstaller variante="lien" className="px-2 mt-1 mb-1" />
        <NavLink
          to="/confidentialite"
          className="block mt-1 px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
        >
          Confidentialité et données
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex md:w-72 md:flex-shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </div>

      {ouverte && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div
            className="absolute inset-0 bg-encre/60"
            onClick={fermer}
            role="presentation"
            aria-hidden="true"
          />
          <div
            className="absolute left-0 top-0 h-full w-72 shadow-lg animate-slide-right"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
