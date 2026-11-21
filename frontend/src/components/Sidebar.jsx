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

const navigation = [
  { nom: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { nom: "Mes Cours", href: "/mes-cours", icon: BookOpen },
  { nom: "Fiches de révision", href: "/fiches", icon: FileText },
  { nom: "Bibliothèque", href: "/bibliotheque", icon: Globe },
  { nom: "Quiz", href: "/quiz", icon: BrainCircuit },
  { nom: "Planning", href: "/planning", icon: Calendar },
  { nom: "Assistant IA", href: "/assistant", icon: MessageSquare },
  { nom: "Analytiques", href: "/analytiques", icon: BarChart3 },
  { nom: "Mon Profil", href: "/profil", icon: Settings },
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
    <div className="flex flex-col h-full bg-card border-r border-border transition-colors">
      <div className="px-7 py-8">
        <Logo />
      </div>

      <nav aria-label="Navigation principale" className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-none">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/"}
              onClick={fermer}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-[0.94rem] font-semibold transition-all group relative",
                  isActive
                    ? "bg-marine text-white dark:bg-primary-500/20 dark:text-primary-100 shadow-[0_10px_24px_-14px_rgba(10,31,74,0.8)]"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-muted"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden="true" className={cn("w-5 h-5 transition-colors", isActive ? "text-secondary-300" : "text-gray-500 group-hover:text-primary-600")} />
                  <span className="flex-1">{item.nom}</span>
                  {isActive && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-secondary-300" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
         <div className="bg-muted/60 rounded-3xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-primary-600 font-black shadow-sm">
                {utilisateur?.nom?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                  {utilisateur?.nom || "Étudiant"}
                </p>
                <p className="text-[10px] font-bold text-gray-500 truncate">
                  {utilisateur?.email || ""}
                </p>
              </div>
            </div>
            <Button
              onClick={handleDeconnexion}
              variant="ghost"
              aria-label="Se déconnecter"
              className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold px-3"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Déconnexion
            </Button>
            <NavLink
              to="/confidentialite"
              className="block mt-2 px-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400 underline hover:text-primary-700"
            >
              Confidentialité et données
            </NavLink>
         </div>
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={fermer}
            role="presentation"
            aria-hidden="true"
          />
          <div
            className="absolute left-0 top-0 h-full w-72 shadow-2xl animate-slide-right"
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
