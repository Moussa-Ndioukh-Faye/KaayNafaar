import { useState } from "react";
import { Check, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import { feedbackAPI } from "../../services/api";

const AVIS = [
  { note: 1, categorie: "trop_difficile", libelle: "Pas utile", icone: ThumbsDown, survol: "hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500" },
  { note: 3, categorie: "utile", libelle: "Moyennement utile", icone: Meh, survol: "hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500" },
  { note: 5, categorie: "parfait", libelle: "Très utile", icone: ThumbsUp, survol: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500" },
];

/** « Utile ? » : avis de l'étudiant sur une réponse de l'IA */
export default function BoutonsAvis({ msg }) {
  const [envoye, setEnvoye] = useState(null);

  const envoyerAvis = async (note, categorie) => {
    if (envoye) return;
    setEnvoye(note);
    try {
      await feedbackAPI.envoyer({
        type: "chat",
        note,
        categorie,
        contenuAssistant: msg.content,
        interactionComplete: msg.content?.substring(0, 500),
      });
    } catch (_) {
      /* l'avis est facultatif */
    }
  };

  if (envoye) {
    return (
      <div role="status" className="flex items-center gap-1 mt-3 text-xs font-bold text-gray-500">
        <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
        Merci de ton retour
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500 mr-1">Utile ?</span>
      {AVIS.map(({ note, categorie, libelle, icone: Icone, survol }) => (
        <button
          key={note}
          type="button"
          onClick={() => envoyerAvis(note, categorie)}
          className={`p-1.5 rounded-lg text-gray-500 transition-colors ${survol}`}
          title={libelle}
          aria-label={libelle}
        >
          <Icone className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
