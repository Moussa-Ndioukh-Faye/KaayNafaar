/**
 * Page de Connexion — UI modernisée avec Google Material Icons
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../App";

export default function Connexion() {
  const [form, setForm] = useState({ email: "", motDePasse: "" });
  const [erreur, setErreur] = useState("");
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
      // token stocké en cookie par le backend, AuthProvider va l'ignorer
      connecter(data.token, data.utilisateur);
      navigate("/");
    } catch (error) {
      if (!error.response) {
        setErreur("Impossible de joindre le serveur. Vérifie que le backend est démarré (port 5001).");
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
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary-600 to-violet-700 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-xs text-center space-y-6">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm">
            <span className="icon icon-filled text-white" style={{ fontSize: 44 }}>school</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight">Content de te revoir !</h2>
          <p className="text-white/75 leading-relaxed">
            Continue tes révisions là où tu t'étais arrêté.
          </p>
          <div className="space-y-3 pt-2">
            {[
              { icon: "trending_up", text: "Suis ta progression en temps réel" },
              { icon: "bolt", text: "Génération de fiches en quelques secondes" },
              { icon: "workspace_premium", text: "Flashcards et quiz adaptatifs" },
            ].map(({ icon, text }) => (
              <div key={icon} className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-3 backdrop-blur-sm text-left">
                <span className="icon icon-filled text-white/90" style={{ fontSize: 20 }}>{icon}</span>
                <p className="text-sm text-white/90">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow">
              <span className="icon icon-filled text-white" style={{ fontSize: 28 }}>school</span>
            </div>
            <p className="text-lg font-bold text-gray-900">RévisionIA</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Connexion</h2>
              <p className="text-gray-500 mt-1 text-sm">Accède à ton espace de révision</p>
            </div>

            {erreur && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5" role="alert">
                <span className="icon icon-filled text-red-500" style={{ fontSize: 18 }}>error</span>
                <span>{erreur}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse email
                </label>
                <div className="relative">
                  <span className="icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>mail</span>
                  <input
                    id="email" name="email" type="email"
                    autoComplete="email" required
                    className="input-field pl-10"
                    placeholder="ton@email.com"
                    value={form.email} onChange={handleChange}
                    maxLength={254}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="motDePasse" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <span className="icon absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>lock</span>
                  <input
                    id="motDePasse" name="motDePasse"
                    type={voirMotDePasse ? "text" : "password"}
                    autoComplete="current-password" required
                    className="input-field pl-10 pr-11"
                    placeholder="••••••••"
                    value={form.motDePasse} onChange={handleChange}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMotDePasse(!voirMotDePasse)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    <span className="icon" style={{ fontSize: 18 }}>
                      {voirMotDePasse ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button type="submit" disabled={chargement} className="btn-primary w-full py-3 justify-center text-base">
                {chargement ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Connexion…
                  </>
                ) : (
                  <>
                    <span className="icon">login</span>
                    Se connecter
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Pas encore de compte ?{" "}
              <Link to="/inscription" className="text-primary-600 font-semibold hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
