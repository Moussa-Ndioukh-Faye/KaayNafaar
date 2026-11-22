/**
 * Page de Connexion — UI modernisée avec Google Material Icons
 */

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
} from "lucide-react";
import { authAPI } from "../services/api";
import { useAuth } from "../App";
import Logo from "../components/marque/Logo";
import PanneauMarque from "../components/marque/PanneauMarque";
import EmailEnvoye from "../components/auth/EmailEnvoye";

export default function Connexion() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", motDePasse: "" });
  const [erreur, setErreur] = useState(searchParams.get("session") === "expiree" ? "Ta session a expiré. Connecte-toi à nouveau." : "");
  const [chargement, setChargement] = useState(false);
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const { connecter } = useAuth();
  const navigate = useNavigate();
  const [emailNonVerifie, setEmailNonVerifie] = useState("");

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
      connecter(data.utilisateur);
      navigate("/");
    } catch (error) {
      if (!error.response) {
        setErreur("Impossible de joindre le serveur. Vérifie que le backend est démarré.");
      } else if (error.response.data?.code === "EMAIL_NON_VERIFIE") {
        setEmailNonVerifie(error.response.data.email || form.email);
      } else {
        setErreur(error.response.data?.message || "Erreur de connexion.");
      }
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <PanneauMarque
        titre={<>Content de te <span className="trait-main">revoir</span>.</>}
        accroche="Reprends là où tu t'étais arrêté : tes fiches, tes quiz et ton planning t'attendent."
      />

      {/* Panneau droit — formulaire */}
      <main id="contenu" className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-10">
            <Logo />
          </div>

          <div className="bg-card rounded-xl border border-border p-8 sm:p-10 shadow-lg">
            {emailNonVerifie ? (
              <EmailEnvoye
                email={emailNonVerifie}
                message="Ton adresse n'est pas encore confirmée. Le lien a été envoyé à"
                delaiInitial={0}
              />
            ) : (<>
            <div className="mb-8">
              <h1 className="text-4xl font-semibold text-gray-900 dark:text-white">Connexion</h1>
              <p className="text-slate-500 mt-1 font-medium">Connecte-toi pour continuer tes révisions</p>
            </div>

            {erreur && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-2xl text-sm mb-6 animate-shake" role="alert">
                <AlertCircle className="w-5 h-5 text-red-700 shrink-0" />
                <span className="font-semibold">{erreur}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-foreground">
                  Adresse email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary w-5 h-5 pointer-events-none" />
                  <input
                    id="email" name="email" type="email"
                    autoComplete="email" required
                    className="input-field pl-11 h-12"
                    placeholder="ton@email.com"
                    value={form.email} onChange={handleChange}
                    maxLength={254}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="motDePasse" className="block text-sm font-semibold text-foreground">
                    Mot de passe
                  </label>
                  <Link
                    to="/mot-de-passe-oublie"
                    className="text-sm font-semibold text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary w-5 h-5 pointer-events-none" />
                  <input
                    id="motDePasse" name="motDePasse"
                    type={voirMotDePasse ? "text" : "password"}
                    autoComplete="current-password" required
                    className="input-field pl-11 pr-12 h-12"
                    placeholder="••••••••"
                    value={form.motDePasse} onChange={handleChange}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setVoirMotDePasse(!voirMotDePasse)}
                    aria-label={voirMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    aria-pressed={voirMotDePasse}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-md text-muted-foreground hover:text-primary"
                  >
                    {voirMotDePasse ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={chargement} className="btn-primary w-full py-4 justify-center text-lg mt-2">
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
                <Link to="/inscription" className="text-primary-700 font-bold hover:text-primary-800 transition-colors ml-1">
                  Créer un compte
                </Link>
              </p>
              <p className="text-xs text-slate-600 mt-4">
                <Link to="/confidentialite" className="underline hover:text-primary-700">Politique de confidentialité</Link>
              </p>
            </div>
            </>)}
          </div>
        </div>
      </main>
    </div>
  );
}