/**
 * Sidebar — Navigation latérale
 * Responsive : drawer sur mobile, fixe sur desktop
 */

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../App";

const navigation = [
  { nom: "Tableau de bord", href: "/", emoji: "🏠" },
  { nom: "Mes Cours", href: "/mes-cours", emoji: "📚" },
  { nom: "Fiches de révision", href: "/fiches", emoji: "📋" },
  { nom: "Quiz", href: "/quiz", emoji: "🧠" },
  { nom: "Planning", href: "/planning", emoji: "📅" },
  { nom: "Assistant IA", href: "/assistant", emoji: "🤖" },
  { nom: "Mon Profil", href: "/profil", emoji: "⚙️" },
];

export default function Sidebar({ ouverte, fermer }) {
  const { utilisateur, deconnecter } = useAuth();
  const navigate = useNavigate();

  const handleDeconnexion = () => {
    deconnecter();
    navigate("/connexion");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          R
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">RévisionIA</p>
          <p className="text-xs text-gray-500">Apprends mieux, plus vite</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            onClick={fermer}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-50 text-primary-700 border border-primary-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <span className="text-lg">{item.emoji}</span>
            {item.nom}
          </NavLink>
        ))}
      </nav>

      {/* Profil utilisateur */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
            {utilisateur?.nom?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {utilisateur?.nom || "Étudiant"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {utilisateur?.email || ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleDeconnexion}
          className="w-full text-left text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
        >
          🚪 Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop : sidebar fixe */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile : overlay + drawer */}
      {ouverte && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay semi-transparent */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={fermer}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
