/**
 * Page d'Inscription — UI modernisée avec Google Material Icons
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../App";

export default function Inscription() {
  const [form, setForm] = useState({
    nom: "", email: "", motDePasse: "", confirmMotDePasse: "", niveauEtude: "licence",
  });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [champsVus, setChampsVus] = useState({});
  const { connecter } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErreur("");
  };

  const handleBlur = (e) => {
    setChampsVus((prev) => ({ ...prev, [e.target.name]: true }));
  };

  const valider = () => {
    if (!form.nom.trim() || !form.email.trim() || !form.motDePasse) return "Tous les champs sont requis.";
    if (form.nom.trim().length < 2) return "Le nom doit faire au moins 2 caractères.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Adresse email invalide.";
    if (form.motDePasse.length < 6) return "Le mot de passe doit contenir au moins 6 caractères.";
    if (form.motDePasse !== form.confirmMotDePasse) return "Les mots de passe ne correspondent pas.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = valider();
    if (err) { setErreur(err); return; }

    setChargement(true);
    try {
      const { data } = await authAPI.inscription({
        nom: form.nom.trim(),
        email: form.email.trim().toLowerCase(),
        motDePasse: form.motDePasse,
        niveauEtude: form.niveauEtude,
      });
      // le token est renvoyé mais stocké en cookie; AuthProvider l'ignore
      connecter(data.token, data.utilisateur);
      navigate("/");
    } catch (error) {
      if (!error.response) {
        setErreur("Impossible de joindre le serveur. Vérifie que le backend est démarré (port 5001).");
      } else {
        setErreur(error.response.data?.message || "Erreur lors de l'inscription.");
      }
    } finally {
      setChargement(false);
    }
  };

  const forceMotDePasse = () => {
    const mdp = form.motDePasse;
    if (!mdp) return 0;
    let score = 0;
    if (mdp.length >= 6) score++;
    if (mdp.length >= 10) score++;
    if (/[A-Z]/.test(mdp)) score++;
    if (/[0-9]/.test(mdp)) score++;
    if (/[^A-Za-z0-9]/.test(mdp)) score++;
    return score;
  };

  const force = forceMotDePasse();
  const forceLabel = ["", "Très faible", "Faible", "Moyen", "Fort", "Très fort"][force];
  const forceCouleur = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"][force];

  const niveaux = [
    { value: "lycée", label: "Lycée" },
    { value: "licence", label: "Licence (L1–L3)" },
    { value: "master", label: "Master (M1–M2)" },
    { value: "doctorat", label: "Doctorat" },
    { value: "autre", label: "Autre" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche décoratif (desktop) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary-600 to-violet-700 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="relative z-10 max-w-xs text-center space-y-6">
          {/* Animated Logo */}
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm logo-animate">
            <span className="text-5xl font-bold text-white">K</span>
          </div>
          
          <h2 className="text-4xl font-bold gradient-text bg-white bg-clip-text text-transparent leading-tight">
            Kay Nafar
          </h2>
          <p className="text-white/80 text-lg font-medium">Ton assistant d'études intelligent</p>
          
          <p className="text-white/75 leading-relaxed">
            Génère des fiches, des quiz et des plannings personnalisés grâce à l'IA.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: "auto_stories", label: "Fiches IA" },
              { icon: "quiz", label: "Quiz" },
              { icon: "calendar_month", label: "Planning" },
            ].map(({ icon, label }) => (
              <div key={icon} className="bg-white/15 rounded-2xl py-4 px-2 backdrop-blur-sm text-center hover:bg-white/25 transition-all duration-300 hover:scale-105">
                <span className="icon icon-filled block mb-2" style={{ fontSize: 28 }}>{icon}</span>
                <p className="text-xs font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Logo mobile avec animation */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg logo-animate">
              <span className="text-3xl font-bold text-white">K</span>
            </div>
            <h2 className="text-2xl font-bold gradient-text">Kay Nafar</h2>
            <p className="text-sm text-gray-500">Ton assistant d'études</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Créer un compte</h2>
              <p className="text-gray-500 mt-1 text-sm">C'est gratuit et prend moins d'une minute</p>
            </div>

            {erreur && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5" role="alert">
                <span className="icon icon-filled text-red-500" style={{ fontSize: 18 }}>error</span>
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Nom */}
              <div>
                <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
                <div className="relative">
                  <span className="icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>person</span>
                  <input
                    id="nom" name="nom" type="text" required autoComplete="name"
                    className="input-field pl-10" placeholder="Jean Dupont"
                    value={form.nom} onChange={handleChange} onBlur={handleBlur} maxLength={100}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Adresse email</label>
                <div className="relative">
                  <span className="icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>mail</span>
                  <input
                    id="email" name="email" type="email" required autoComplete="email"
                    className="input-field pl-10" placeholder="jean@email.com"
                    value={form.email} onChange={handleChange} onBlur={handleBlur} maxLength={254}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="motDePasse" className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <span className="icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>lock</span>
                  <input
                    id="motDePasse" name="motDePasse" type="password" required autoComplete="new-password"
                    className="input-field pl-10" placeholder="Min. 6 caractères"
                    value={form.motDePasse} onChange={handleChange} onBlur={handleBlur} maxLength={128}
                  />
                </div>
                {form.motDePasse && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= force ? forceCouleur : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{forceLabel}</p>
                  </div>
                )}
              </div>

              {/* Confirmer mot de passe */}
              <div>
                <label htmlFor="confirmMotDePasse" className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <span className="icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>lock_reset</span>
                  <input
                    id="confirmMotDePasse" name="confirmMotDePasse" type="password" required autoComplete="new-password"
                    className={`input-field pl-10 pr-10 ${
                      champsVus.confirmMotDePasse && form.confirmMotDePasse && form.motDePasse !== form.confirmMotDePasse
                        ? "border-red-300 focus:ring-red-400"
                        : ""
                    }`}
                    placeholder="••••••••"
                    value={form.confirmMotDePasse} onChange={handleChange} onBlur={handleBlur} maxLength={128}
                  />
                  {champsVus.confirmMotDePasse && form.confirmMotDePasse && (
                    <span
                      className={`icon icon-filled absolute right-3.5 top-1/2 -translate-y-1/2 ${form.motDePasse === form.confirmMotDePasse ? "text-green-500" : "text-red-400"}`}
                      style={{ fontSize: 18 }}
                    >
                      {form.motDePasse === form.confirmMotDePasse ? "check_circle" : "cancel"}
                    </span>
                  )}
                </div>
              </div>

              {/* Niveau d'étude */}
              <div>
                <label htmlFor="niveauEtude" className="block text-sm font-medium text-gray-700 mb-1.5">Niveau d'étude</label>
                <div className="relative">
                  <span className="icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>school</span>
                  <select
                    id="niveauEtude" name="niveauEtude"
                    className="input-field pl-10 pr-10 appearance-none"
                    value={form.niveauEtude} onChange={handleChange}
                  >
                    {niveaux.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <span className="icon absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ fontSize: 18 }}>expand_more</span>
                </div>
              </div>

              <button type="submit" disabled={chargement} className="btn-primary w-full py-3 justify-center text-base mt-1">
                {chargement ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Création du compte…
                  </>
                ) : (
                  <>
                    <span className="icon">person_add</span>
                    Créer mon compte
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Déjà un compte ?{" "}
              <Link to="/connexion" className="text-primary-600 font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
