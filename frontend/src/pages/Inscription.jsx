import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  School,
  UserPlus,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { authAPI } from "../services/api";
import { useAuth } from "../App";
import Logo from "../components/marque/Logo";
import PanneauMarque from "../components/marque/PanneauMarque";
import EmailEnvoye from "../components/auth/EmailEnvoye";
import { cn } from "../lib/utils";

export default function Inscription() {
  const [form, setForm] = useState({
    nom: "", email: "", motDePasse: "", confirmMotDePasse: "", niveauEtude: "licence",
  });
  const [consentement, setConsentement] = useState(false);
  const [emailEnAttente, setEmailEnAttente] = useState("");
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
    if (form.motDePasse.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (new TextEncoder().encode(form.motDePasse).length > 72) return "Le mot de passe est trop long (72 caractères maximum).";
    if (form.motDePasse !== form.confirmMotDePasse) return "Les mots de passe ne correspondent pas.";
    if (!consentement) return "Tu dois accepter la politique de confidentialité pour créer un compte.";
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
      if (data.verificationRequise) {
        setEmailEnAttente(data.email);
        return;
      }
      connecter(data.utilisateur);
      navigate("/");
    } catch (error) {
      if (!error.response) {
        setErreur("Impossible de joindre le serveur. Vérifie que le backend est démarré.");
      } else {
        setErreur(
          error.response.data?.errors?.[0]?.msg ||
            error.response.data?.message ||
            "Erreur lors de l'inscription."
        );
      }
    } finally {
      setChargement(false);
    }
  };

  const forceMotDePasse = () => {
    const mdp = form.motDePasse;
    if (!mdp) return 0;
    let score = 0;
    if (mdp.length >= 8) score++;
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
      <PanneauMarque
        titre={<>Tes cours, <span className="trait-main">en mieux</span>.</>}
        accroche="Crée ton compte gratuit et transforme tes cours en fiches, quiz et planning de révision."
      />

      {/* Panneau droit — formulaire */}
      <main id="contenu" className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-10">
            <Logo />
          </div>

          <div className="bg-card rounded-[2rem] border border-border p-8 sm:p-10 shadow-[0_24px_60px_-32px_rgba(10,31,74,0.28)]">
            {emailEnAttente ? (
              <EmailEnvoye email={emailEnAttente} />
            ) : (<>
            <div className="mb-8">
              <h1 className="text-4xl font-semibold text-gray-900 dark:text-white">Créer un compte</h1>
              <p className="text-slate-600 mt-1 font-medium">C'est gratuit et prend moins d'une minute</p>
            </div>

            {erreur && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-2xl text-sm mb-6 animate-shake" role="alert">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="font-semibold">{erreur}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Nom */}
              <div className="space-y-2">
                <label htmlFor="nom" className="block text-sm font-bold text-gray-700 ml-1">Nom complet</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                  <input
                    id="nom" name="nom" type="text" required autoComplete="name"
                    className="input-field pl-12 h-14" placeholder="Jean Dupont"
                    value={form.nom} onChange={handleChange} onBlur={handleBlur} maxLength={100}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 ml-1">Adresse email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                  <input
                    id="email" name="email" type="email" required autoComplete="email"
                    className="input-field pl-12 h-14" placeholder="jean@email.com"
                    value={form.email} onChange={handleChange} onBlur={handleBlur} maxLength={254}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <label htmlFor="motDePasse" className="block text-sm font-bold text-gray-700 ml-1">Mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                  <input
                    id="motDePasse" name="motDePasse" type="password" required autoComplete="new-password"
                    className="input-field pl-12 h-14" placeholder="Min. 8 caractères"
                    aria-describedby="aide-mot-de-passe"
                    value={form.motDePasse} onChange={handleChange} onBlur={handleBlur} maxLength={72}
                  />
                </div>
                <p id="aide-mot-de-passe" className="text-xs text-slate-600 ml-1">
                  8 caractères minimum. Une phrase de passe longue est plus sûre qu'un mot court et compliqué.
                </p>
                {form.motDePasse && (
                  <div className="mt-2 px-1" aria-live="polite">
                    <div className="flex gap-1.5 mb-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= force ? forceCouleur : "bg-slate-100"}`} />
                      ))}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      <span className="sr-only">Robustesse du mot de passe : </span>{forceLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmer mot de passe */}
              <div className="space-y-2">
                <label htmlFor="confirmMotDePasse" className="block text-sm font-bold text-gray-700 ml-1">Confirmer le mot de passe</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                  <input
                    id="confirmMotDePasse" name="confirmMotDePasse" type="password" required autoComplete="new-password"
                    className={cn(
                        "input-field pl-12 pr-12 h-14",
                        champsVus.confirmMotDePasse && form.confirmMotDePasse && form.motDePasse !== form.confirmMotDePasse && "border-red-300 focus:ring-red-100 focus:border-red-400"
                    )}
                    placeholder="••••••••"
                    value={form.confirmMotDePasse} onChange={handleChange} onBlur={handleBlur} maxLength={72}
                  />
                  {champsVus.confirmMotDePasse && form.confirmMotDePasse && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {form.motDePasse === form.confirmMotDePasse ? (
                        <CheckCircle className="w-5 h-5 text-green-500" aria-label="Les mots de passe correspondent" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" aria-label="Les mots de passe ne correspondent pas" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Niveau d'étude */}
              <div className="space-y-2">
                <label htmlFor="niveauEtude" className="block text-sm font-bold text-gray-700 ml-1">Niveau d'étude</label>
                <div className="relative group">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                  <select
                    id="niveauEtude" name="niveauEtude"
                    className="input-field pl-12 pr-12 h-14 appearance-none cursor-pointer"
                    value={form.niveauEtude} onChange={handleChange}
                  >
                    {niveaux.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none w-5 h-5" />
                </div>
              </div>

              {/* Consentement (RGPD art. 7 / loi sénégalaise 2008-12) */}
              <div className="flex items-start gap-3 px-1">
                <input
                  id="consentement" name="consentement" type="checkbox" required
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  checked={consentement}
                  onChange={(e) => { setConsentement(e.target.checked); setErreur(""); }}
                />
                <label htmlFor="consentement" className="text-sm text-slate-700">
                  J'accepte que mes données (profil et cours importés) soient traitées pour fournir le service,
                  y compris par des fournisseurs d'IA, comme décrit dans la{" "}
                  <Link to="/confidentialite" target="_blank" className="text-primary-700 font-bold underline">
                    politique de confidentialité
                  </Link>.
                </label>
              </div>

              <button type="submit" disabled={chargement} className="btn-primary w-full py-4 justify-center text-lg shadow-primary-500/20 mt-4">
                {chargement ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Création du compte…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    <span>Créer mon compte</span>
                  </div>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600 font-medium">
                Déjà un compte ?{" "}
                <Link to="/connexion" className="text-primary-700 font-bold hover:text-primary-800 transition-colors ml-1">
                  Se connecter
                </Link>
              </p>
            </div>
            </>)}
          </div>
        </div>
      </main>
    </div>
  );
}
