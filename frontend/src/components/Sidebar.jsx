import React from "react";
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
  ChevronRight,
  Sparkles,
  Globe
} from "lucide-react";
import { useAuth } from "../App";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

const navigation = [
  { nom: "Tableau de bord", href: "/", icon: LayoutDashboard },
  { nom: "Mes Cours", href: "/mes-cours", icon: BookOpen },
  { nom: "Fiches de révision", href: "/fiches", icon: FileText },
  { nom: "Bibliothèque", href: "/bibliotheque", icon: Globe },
  { nom: "Quiz", href: "/quiz", icon: BrainCircuit },
  { nom: "Planning", href: "/planning", icon: Calendar },
  { nom: "Assistant IA", href: "/assistant", icon: MessageSquare },
  { nom: "Mon Profil", href: "/profil", icon: Settings },
];

export default function Sidebar({ ouverte, fermer }) {
  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();

  const handleDeconnexion = () => {
    deconnecter();
    navigate("/connexion");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-colors">
      <div className="flex items-center gap-3 px-8 py-8">
        <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-200 dark:shadow-none">
          <Sparkles className="w-6 h-6 fill-current" />
        </div>
        <div>
          <p className="font-black text-gray-900 dark:text-white text-xl tracking-tight leading-none">Kaay Nafaar</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 mt-1">Études 2.0</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-none">
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
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group relative",
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300")} />
                  <span className="flex-1">{item.nom}</span>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
         <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-5 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-primary-600 font-black shadow-sm">
                {utilisateur?.nom?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                  {utilisateur?.nom || "Étudiant"}
                </p>
                <p className="text-[10px] font-bold text-gray-400 truncate">
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
              <LogOut className="w-4 h-4" />
              Déconnexion
            </Button>
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
          />
          <div className="absolute left-0 top-0 h-full w-72 shadow-2xl animate-slide-right">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
