/**
 * Page de Connexion — UI modernisée avec Google Material Icons
 */

import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  TrendingUp,
  Zap,
  Award,
  Sparkles
} from "lucide-react";
import { authAPI } from "../services/api";
import { useAuth } from "../App";

export default function Connexion() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", motDePasse: "" });
  const [erreur, setErreur] = useState(searchParams.get("session") === "expiree" ? "Ta session a expiré. Connecte-toi à nouveau." : "");
  const [chargement, setChargement] = useState(false);
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const { connecter } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.name === "email" ? e.target.value.trim() : e.target.value;
    setForm({ ...form, [e.target.name]: value });
    setErreur("");
  };

  const validerFormulaire = () => {
    if (!form.email || !form.motDePasse) return "Tous les champs sont requis.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Email invalide.";
    if (form.motDePasse.length < 6) return "Le mot de passe doit faire au moins 6 caractères.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validerFormulaire();
    if (err) { setErreur(err); return; }

    setChargement(true);
    try {
      const { data } = await authAPI.connexion(form);
      connecter(null, data.utilisateur);
      navigate("/");
    } catch (error) {
      if (!error.response) {
        setErreur(`Impossible de joindre le serveur à l'adresse ${authAPI.getBaseURL()}. Vérifie ta connexion et les variables d'environnement.`);
      } else {
        setErreur(error.response.data?.message || "Erreur de connexion.");
      }
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche décoratif (desktop) */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary-600 to-secondary-600 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-48 h-48 bg-white/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="relative z-10 max-w-xs text-center space-y-6">
          {/* Animated Logo */}
          <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center mx-auto backdrop-blur-sm shadow-2xl border border-white/20">
            <Sparkles className="w-12 h-12 text-white fill-current" />
          </div>
          
          <h2 className="text-4xl font-black tracking-tight">
            Kaay Nafaar
          </h2>
          <p className="text-white/80 text-lg font-medium italic">Études 2.0 augmentées par l'IA</p>
          
          <div className="space-y-4 pt-4">
            {[
              { icon: TrendingUp, text: "Suis ta progression en temps réel" },
              { icon: Zap, text: "Génération de fiches en quelques secondes" },
              { icon: Award, text: "Flashcards et quiz adaptatifs" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4 bg-white/10 hover:bg-white/20 rounded-2xl px-5 py-4 backdrop-blur-md text-left transition-all duration-300 border border-white/5 shadow-lg group">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-white/90">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-200">
              <Sparkles className="w-10 h-10 text-white fill-current" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Kaay Nafaar</h2>
            <p className="text-sm font-bold text-primary-600 uppercase tracking-widest mt-1">Études 2.0</p>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bienvenue</h2>
              <p className="text-slate-500 mt-1 font-medium">Connecte-toi pour continuer tes révisions</p>
            </div>

            {erreur && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-2xl text-sm mb-6 animate-shake" role="alert">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-semibold">{erreur}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 ml-1">
                  Adresse email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                  <input
                    id="email" name="email" type="email"
                    autoComplete="email" required
                    className="input-field pl-12 h-14"
                    placeholder="ton@email.com"
                    value={form.email} onChange={handleChange}
                    maxLength={254}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <label htmlFor="motDePasse" className="block text-sm font-bold text-gray-700 ml-1">
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                  <input
                    id="motDePasse" name="motDePasse"
                    type={voirMotDePasse ? "text" : "password"}
                    autoComplete="current-password" required
                    className="input-field pl-12 pr-12 h-14"
                    placeholder="••••••••"
                    value={form.motDePasse} onChange={handleChange}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMotDePasse(!voirMotDePasse)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 focus:outline-none transition-colors"
                    tabIndex={-1}
                  >
                    {voirMotDePasse ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={chargement} className="btn-primary w-full py-4 justify-center text-lg shadow-primary-500/20 mt-2">
                {chargement ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Connexion…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-5 h-5" />
                    <span>Se connecter</span>
                  </div>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Pas encore de compte ?{" "}
                <Link to="/inscription" className="text-primary-600 font-bold hover:text-primary-700 transition-colors ml-1">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}