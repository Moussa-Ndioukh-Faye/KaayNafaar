import { useLocation, Link } from "react-router-dom";
import { 
  Menu, 
  Sun, 
  Moon, 
  User,
  LayoutDashboard,
  BookOpen,
  FileText,
  BrainCircuit,
  Calendar,
  MessageSquare,
  Settings
} from "lucide-react";
import { useAuth, useDarkMode } from "../App";
import { Button } from "./ui/button";
import { LogoMarque } from "./marque/Logo";

const titresPages = {
  "/": { label: "Tableau de bord", icon: LayoutDashboard },
  "/mes-cours": { label: "Mes Cours", icon: BookOpen },
  "/fiches": { label: "Fiches de révision", icon: FileText },
  "/quiz": { label: "Quiz & Évaluation", icon: BrainCircuit },
  "/planning": { label: "Mon Planning", icon: Calendar },
  "/assistant": { label: "Assistant IA", icon: MessageSquare },
  "/profil": { label: "Mon Profil", icon: Settings },
};

export default function Navbar({ ouvrir }) {
  const location = useLocation();
  const { utilisateur } = useAuth();
  const { darkMode, setDarkMode } = useDarkMode();
  const pageInfo = titresPages[location.pathname] || { label: "", icon: null };
  const Icon = pageInfo.icon;

  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-border px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
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
          
          {Icon && (
            <div className="hidden md:flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary-700 dark:text-primary-300" aria-hidden="true">
                  <Icon className="w-5 h-5" />
               </div>
               <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-white leading-none">{pageInfo.label}</h1>
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
          className="rounded-xl w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </Button>
        
        <div className="h-6 w-px bg-gray-100 dark:bg-gray-800" />

        <Link
           to="/profil"
           aria-label="Mon profil"
           className="flex items-center gap-3 pl-2 cursor-pointer group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-black text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
               {utilisateur?.nom?.split(" ")[0]}
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Compte étudiant</span>
          </span>
          <span className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 border-2 border-transparent group-hover:border-primary-100 dark:group-hover:border-primary-900 transition-all">
            <User className="w-5 h-5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </header>
  );
}
