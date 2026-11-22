import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { authAPI } from "../services/api";
import { LogoComplet } from "../components/marque/Logo";

const octets = (texte) => new TextEncoder().encode(texte).length;

/** Page ouverte depuis le lien reçu par email : /reinitialiser-mot-de-passe?token=… */
export default function ReinitialiserMotDePasse() {
  const [params] = useSearchParams();
  // Le jeton est lu une fois puis retiré de la barre d'adresse (historique, partage d'écran)
  const [token] = useState(() => params.get("token") || "");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [etat, setEtat] = useState(token ? "formulaire" : "invalide");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    document.title = "Nouveau mot de passe — Kaay Nafaar";
    if (token) window.history.replaceState(null, "", "/reinitialiser-mot-de-passe");
  }, [token]);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    if (motDePasse.length < 8) return setErreur("Le mot de passe doit faire au moins 8 caractères.");
    if (octets(motDePasse) > 72) return setErreur("Le mot de passe est trop long (72 octets maximum).");
    if (motDePasse !== confirmation) return setErreur("Les deux mots de passe ne correspondent pas.");

    setChargement(true);
    try {
      await authAPI.reinitialiserMotDePasse(token, motDePasse);
      setEtat("succes");
    } catch (err) {
      const donnees = err.response?.data;
      if (donnees?.code === "JETON_INVALIDE") setEtat("invalide");
      else setErreur(donnees?.errors?.[0]?.msg || donnees?.message || "Une erreur est survenue. Réessaie.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <main id="contenu" className="fond-teinte min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 sm:p-10 shadow-lg">
        <div className="flex justify-center mb-8">
          <LogoComplet className="w-36" />
        </div>

        {etat === "succes" && (
          <div className="text-center" role="status" aria-live="polite">
            <CheckCircle2 className="mx-auto w-14 h-14 text-primary-600" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-bold text-marine dark:text-white">Mot de passe modifié</h1>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Tes autres sessions ont été déconnectées. Connecte-toi avec ton nouveau mot de passe.
            </p>
            <Link
              to="/connexion"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary-600 hover:bg-primary-700 px-6 font-semibold text-white"
            >
              Se connecter
            </Link>
          </div>
        )}

        {etat === "invalide" && (
          <div className="text-center">
            <AlertCircle className="mx-auto w-12 h-12 text-secondary-500" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-bold text-marine dark:text-white">Lien invalide ou expiré</h1>
            <p role="alert" className="mt-3 text-gray-600 dark:text-gray-300">
              Ce lien a déjà servi ou a dépassé 15 minutes. Fais une nouvelle demande.
            </p>
            <Link
              to="/mot-de-passe-oublie"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary-600 hover:bg-primary-700 px-6 font-semibold text-white"
            >
              Recevoir un nouveau lien
            </Link>
          </div>
        )}

        {etat === "formulaire" && (
          <>
            <h1 className="text-2xl font-bold text-marine dark:text-white text-center">Choisis un nouveau mot de passe</h1>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-300">8 caractères minimum. Une phrase facile à retenir marche très bien.</p>
            <form className="mt-6 space-y-4" onSubmit={soumettre}>
              <div className="space-y-2">
                <label htmlFor="nouveau-mdp" className="text-sm font-semibold text-marine dark:text-white">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    id="nouveau-mdp"
                    type={voir ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="input-field h-12 pr-12"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    aria-describedby={erreur ? "erreur-reinit" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setVoir(!voir)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-primary-600"
                    aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {voir ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmation-mdp" className="text-sm font-semibold text-marine dark:text-white">
                  Confirme le mot de passe
                </label>
                <input
                  id="confirmation-mdp"
                  type={voir ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  className="input-field h-12"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </div>
              {erreur && (
                <p id="erreur-reinit" role="alert" className="text-sm font-medium text-red-700">
                  {erreur}
                </p>
              )}
              <button
                type="submit"
                disabled={chargement}
                className="w-full h-12 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 font-semibold text-white inline-flex items-center justify-center gap-2"
              >
                {chargement && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
                Enregistrer le mot de passe
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
