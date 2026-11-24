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
  BarChart3,
  NotebookPen
} from "lucide-react";
import { useAuth } from "../App";
import { cn } from "../lib/utils";
import Logo from "./marque/Logo";
import { Button } from "./ui/button";
import BoutonInstaller from "./BoutonInstaller";

// Menu à la manière des Réglages iOS : icônes dans des pastilles colorées.
// Les teintes reprennent le bleu du logo et le vert, jaune, rouge du drapeau.
const sommaire = [
  {
    rubrique: "Réviser",
    entrees: [
      { nom: "Tableau de bord", href: "/", icon: LayoutDashboard, teinte: "bg-[#0047db]" },
      { nom: "Mes cours", href: "/mes-cours", icon: BookOpen, teinte: "bg-[#00853f]" },
      { nom: "Carnets", href: "/carnets", icon: NotebookPen, teinte: "bg-[#e8590c]" },
      { nom: "Fiches de révision", href: "/fiches", icon: FileText, teinte: "bg-[#f5c400] text-[#1c1c1e]" },
      { nom: "Quiz", href: "/quiz", icon: BrainCircuit, teinte: "bg-[#cf1820]" },
      { nom: "Planning", href: "/planning", icon: Calendar, teinte: "bg-[#d63384]" },
    ],
  },
  {
    rubrique: "Explorer",
    entrees: [
      { nom: "Assistant IA", href: "/assistant", icon: MessageSquare, teinte: "bg-[#5b4bdb]" },
      { nom: "Bibliothèque", href: "/bibliotheque", icon: Globe, teinte: "bg-[#0b7f9e]" },
    ],
  },
  {
    rubrique: "Suivre",
    entrees: [
      { nom: "Progression", href: "/analytiques", icon: BarChart3, teinte: "bg-[#2f9e44]" },
      { nom: "Mon profil", href: "/profil", icon: Settings, teinte: "bg-[#636366]" },
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="bande-senegal" aria-hidden="true" />
      <div className="px-5 pt-6 pb-4">
        <Logo />
      </div>

      <nav aria-label="Navigation principale" className="flex-1 px-3 pb-5 overflow-y-auto scrollbar-none">
        {sommaire.map(({ rubrique, entrees }) => (
          <div key={rubrique} className="mb-5">
            <p className="etiquette px-3 mb-1.5">{rubrique}</p>
            <ul>
              {entrees.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      onClick={fermer}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 px-2.5 py-1.5 min-h-[44px] rounded-xl text-[0.9375rem] transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold dark:bg-white/10 dark:text-white"
                            : "text-foreground hover:bg-foreground/[0.05]"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            aria-hidden="true"
                            className={cn("grid place-items-center w-[30px] h-[30px] rounded-[8px] text-white shrink-0", item.teinte)}
                          >
                            <Icon className="w-[17px] h-[17px]" strokeWidth={2.2} />
                          </span>
                          <span className="flex-1">{item.nom}</span>
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

      <div className="px-3 pb-5 pt-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#3d7bff] to-[#0047db] flex items-center justify-center text-base font-semibold text-white"
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
          className="w-full justify-start gap-3 h-11 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Déconnexion
        </Button>
        <BoutonInstaller variante="lien" className="px-2 mt-1 mb-1" />
        <NavLink
          to="/confidentialite"
          className="block mt-1 px-2 py-1 text-xs text-muted-foreground hover:text-primary"
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
            className="absolute inset-0 bg-black/40"
            onClick={fermer}
            role="presentation"
            aria-hidden="true"
          />
          <div
            className="absolute left-0 top-0 h-full w-[18rem] max-w-[85vw] shadow-2xl animate-slide-right bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
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
