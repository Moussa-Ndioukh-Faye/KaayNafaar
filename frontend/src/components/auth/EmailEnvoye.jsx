import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck, RefreshCw } from "lucide-react";
import { authAPI } from "../../services/api";

const DELAI_RENVOI = 60; // secondes, aligné sur la limite du serveur

/** Écran « Vérifie ta boîte mail », avec renvoi de l'email limité à une fois par minute */
export default function EmailEnvoye({ email, message, delaiInitial = DELAI_RENVOI }) {
  const [attente, setAttente] = useState(delaiInitial);
  const [statut, setStatut] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (attente <= 0) return undefined;
    const t = setTimeout(() => setAttente((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  const renvoyer = async () => {
    setEnvoi(true);
    setStatut("");
    try {
      const { data } = await authAPI.renvoyerVerification(email);
      setStatut(data.message || "Un nouvel email vient d'être envoyé.");
      setAttente(DELAI_RENVOI);
    } catch (_) {
      setStatut("Impossible d'envoyer l'email pour le moment. Réessaie dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="text-center">
      <span className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/40 text-primary-600">
        <MailCheck className="w-8 h-8" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-bold text-marine dark:text-white">Vérifie ta boîte mail</h1>
      <p className="mt-3 text-gray-600 dark:text-gray-300">
        {message || "Nous t'avons envoyé un lien de confirmation à"}{" "}
        <strong className="text-marine dark:text-white break-all">{email}</strong>.
        Clique dessus pour activer ton compte.
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Le lien est valable 24 heures. Pense à regarder dans les spams ou l'onglet Promotions.
      </p>

      <button
        type="button"
        onClick={renvoyer}
        disabled={attente > 0 || envoi}
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl border border-primary-200 dark:border-primary-800 px-5 font-semibold text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${envoi ? "animate-spin" : ""}`} aria-hidden="true" />
        {attente > 0 ? `Renvoyer l'email (${attente} s)` : "Renvoyer l'email"}
      </button>

      <p role="status" aria-live="polite" className="mt-4 min-h-[1.5rem] text-sm text-gray-600 dark:text-gray-300">
        {statut}
      </p>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
        Déjà confirmé ?{" "}
        <Link to="/connexion" className="font-bold text-primary-700 dark:text-primary-300 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
