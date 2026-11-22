import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../App";
import { authAPI } from "../services/api";
import { LogoComplet } from "../components/marque/Logo";
import EmailEnvoye from "../components/auth/EmailEnvoye";

/** Page ouverte depuis le lien reçu par email : /verifier-email?token=… */
export default function VerifierEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { connecter } = useAuth();
  const navigate = useNavigate();
  const [etat, setEtat] = useState(token ? "verification" : "invalide");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [emailRenvoi, setEmailRenvoi] = useState("");
  const dejaEnvoye = useRef(false);

  useEffect(() => {
    document.title = "Confirmation de l'email — Kaay Nafaar";
    // Un seul appel : le jeton est à usage unique (StrictMode monte deux fois en dev)
    if (!token || dejaEnvoye.current) return;
    dejaEnvoye.current = true;
    authAPI
      .verifierEmail(token)
      .then(({ data }) => {
        connecter(data.utilisateur);
        setEtat("succes");
        setTimeout(() => navigate("/"), 2500);
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || "Ce lien est invalide ou a expiré.");
        setEtat("invalide");
      });
  }, [token, connecter, navigate]);

  return (
    <main id="contenu" className="fond-teinte min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 sm:p-10 shadow-[0_24px_60px_-32px_rgba(10,31,74,0.28)]">
        <div className="flex justify-center mb-8">
          <LogoComplet className="w-36" />
        </div>

        {etat === "verification" && (
          <div className="text-center" role="status" aria-live="polite">
            <Loader2 className="mx-auto w-10 h-10 text-primary-600 animate-spin" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-bold text-marine dark:text-white">Confirmation en cours…</h1>
          </div>
        )}

        {etat === "succes" && (
          <div className="text-center" role="status" aria-live="polite">
            <CheckCircle2 className="mx-auto w-14 h-14 text-primary-600" aria-hidden="true" />
            <h1 className="mt-6 text-3xl font-bold text-marine dark:text-white">
              Email <span className="trait-main">confirmé</span> !
            </h1>
            <p className="mt-3 text-gray-600 dark:text-gray-300">Ton compte est actif. Redirection vers ton tableau de bord…</p>
            <Link to="/" className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary-600 hover:bg-primary-700 px-6 font-semibold text-white">
              Aller au tableau de bord
            </Link>
          </div>
        )}

        {etat === "invalide" && !email && (
          <div className="text-center">
            <AlertCircle className="mx-auto w-12 h-12 text-secondary-500" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-bold text-marine dark:text-white">Lien invalide ou expiré</h1>
            <p role="alert" className="mt-3 text-gray-600 dark:text-gray-300">
              {message || "Ce lien de confirmation n'est pas valide."} Entre ton adresse pour recevoir un nouveau lien.
            </p>
            <form
              className="mt-6 space-y-3 text-left"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await authAPI.renvoyerVerification(emailRenvoi.trim().toLowerCase());
                } catch (_) {
                  /* réponse générique côté serveur */
                }
                setEmail(emailRenvoi.trim().toLowerCase());
              }}
            >
              <label htmlFor="email-renvoi" className="text-sm font-semibold text-marine dark:text-white">
                Adresse email
              </label>
              <input
                id="email-renvoi"
                type="email"
                required
                autoComplete="email"
                className="input-field h-12"
                value={emailRenvoi}
                onChange={(e) => setEmailRenvoi(e.target.value)}
              />
              <button type="submit" className="w-full h-12 rounded-xl bg-primary-600 hover:bg-primary-700 font-semibold text-white">
                Recevoir un nouveau lien
              </button>
            </form>
          </div>
        )}

        {etat === "invalide" && email && <EmailEnvoye email={email} message="Si un compte non confirmé existe, un nouveau lien a été envoyé à" />}
      </div>
    </main>
  );
}
