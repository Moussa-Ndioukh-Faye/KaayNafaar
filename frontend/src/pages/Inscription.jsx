import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, 
  Mail, 
  Lock, 
  School, 
  UserPlus, 
  AlertCircle, 
  BookOpen, 
  BrainCircuit, 
  Calendar, 
  CheckCircle, 
  XCircle,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { authAPI } from "../services/api";
import { useAuth } from "../App";
import { cn } from "../lib/utils";

export default function Inscription() {
  const [form, setForm] = useState({
    nom: "", email: "", motDePasse: "", confirmMotDePasse: "", niveauEtude: "licence",
  });
  const [consentement, setConsentement] = useState(false);
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
      connecter(data.token, data.utilisateur);
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
          
          <h2 className="text-4xl font-black tracking-tight text-white">
            Kaay Nafaar
          </h2>
          <p className="text-white/80 text-lg font-medium italic text-center">Ton assistant d'études intelligent</p>
          
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { icon: BookOpen, label: "Fiches IA" },
              { icon: BrainCircuit, label: "Quiz" },
              { icon: Calendar, label: "Planning" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-white/10 rounded-2xl py-5 px-2 backdrop-blur-md text-center hover:bg-white/20 transition-all duration-300 hover:scale-105 border border-white/5 shadow-lg group">
                <Icon className="w-8 h-8 mx-auto mb-2 text-white/90 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
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
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Créer un compte</h2>
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
                <Link to="/connexion" className="text-primary-600 font-bold hover:text-primary-700 transition-colors ml-1">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
