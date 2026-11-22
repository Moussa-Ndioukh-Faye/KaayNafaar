import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck, ArrowLeft, Loader2 } from "lucide-react";
import { authAPI } from "../services/api";
import { LogoComplet } from "../components/marque/Logo";

/** Demande d'un lien de réinitialisation : /mot-de-passe-oublie */
export default function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    document.title = "Mot de passe oublié — Kaay Nafaar";
  }, []);

  const soumettre = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      await authAPI.motDePasseOublie(email.trim().toLowerCase());
      setEnvoye(true);
    } catch (err) {
      // 429 : trop de demandes ; sinon la réponse du serveur est volontairement générique
      if (err.response?.status === 429) setErreur(err.response.data?.message || "Trop de demandes. Réessaie plus tard.");
      else setEnvoye(true);
    } finally {
      setChargement(false);
    }
  };

  return (
    <main id="contenu" className="fond-teinte min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-[2rem] p-8 sm:p-10 shadow-[0_24px_60px_-32px_rgba(10,31,74,0.28)]">
        <div className="flex justify-center mb-8">
          <LogoComplet className="w-36" />
        </div>

        {envoye ? (
          <div className="text-center" role="status" aria-live="polite">
            <MailCheck className="mx-auto w-14 h-14 text-primary-600" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-bold text-marine dark:text-white">Vérifie ta boîte mail</h1>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Si un compte existe pour <strong className="text-marine dark:text-white">{email.trim().toLowerCase()}</strong>, tu vas
              recevoir un lien pour choisir un nouveau mot de passe. Il est valable <strong>15 minutes</strong>.
            </p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Pense à regarder dans les spams.</p>
            <Link
              to="/connexion"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary-600 hover:bg-primary-700 px-6 font-semibold text-white"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-marine dark:text-white text-center">Mot de passe oublié ?</h1>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-300">
              Entre l'adresse email de ton compte : on t'envoie un lien pour en choisir un nouveau.
            </p>
            <form className="mt-6 space-y-3" onSubmit={soumettre}>
              <label htmlFor="email-oubli" className="text-sm font-semibold text-marine dark:text-white">
                Adresse email
              </label>
              <input
                id="email-oubli"
                type="email"
                required
                autoComplete="email"
                className="input-field h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={erreur ? "erreur-oubli" : undefined}
              />
              {erreur && (
                <p id="erreur-oubli" role="alert" className="text-sm font-medium text-red-700">
                  {erreur}
                </p>
              )}
              <button
                type="submit"
                disabled={chargement}
                className="w-full h-12 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 font-semibold text-white inline-flex items-center justify-center gap-2"
              >
                {chargement && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
                Recevoir le lien
              </button>
            </form>
            <Link
              to="/connexion"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
