import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, RotateCcw, ChevronRight, Loader2 } from "lucide-react";
import { carnetsAPI } from "../../services/api";
import { Button } from "../ui/button";

const RELANCES_MAX = 6; // le guide se complète en quelques appels (résumés des sources)
const INTERVALLE_MS = 5000;

/**
 * Guide du carnet : vue d'ensemble des sources, sujets clés et questions à explorer.
 * Un sujet ou une question touchés sont posés directement au chat.
 * `cle` change quand les sources changent : le guide est alors redemandé.
 */
export default function GuideCarnet({ carnetId, cle, onQuestion, onGuide }) {
  const [guide, setGuide] = useState(null);
  const [etat, setEtat] = useState("chargement"); // chargement | pret | erreur
  const relances = useRef(0);
  const minuteur = useRef(null);

  const charger = useCallback(
    async (forcer = false) => {
      clearTimeout(minuteur.current);
      if (forcer) setEtat("chargement");
      try {
        const { data } = await carnetsAPI.guide(carnetId, forcer);
        setGuide(data.guide);
        onGuide?.(data.guide);
        setEtat("pret");
        // Des résumés de sources restent à calculer : on repasse dans quelques secondes
        if (!data.guide.complet && relances.current < RELANCES_MAX) {
          relances.current += 1;
          minuteur.current = setTimeout(() => charger(false), INTERVALLE_MS);
        }
      } catch {
        setEtat("erreur");
      }
    },
    [carnetId, onGuide]
  );

  useEffect(() => {
    relances.current = 0;
    charger(false);
    return () => clearTimeout(minuteur.current);
  }, [charger, cle]);

  if (etat === "chargement" && !guide) {
    return (
      <div role="status" className="rounded-2xl bg-card shadow-sm p-5 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        Lecture des sources pour préparer le guide…
      </div>
    );
  }
  if (etat === "erreur" && !guide) {
    return (
      <div className="rounded-2xl bg-card shadow-sm p-5">
        <p className="text-muted-foreground">Le guide n'a pas pu être préparé.</p>
        <Button variant="link" className="h-auto p-0 mt-1" onClick={() => charger(true)}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (!guide?.resume) return null;

  return (
    <section aria-labelledby="titre-guide" className="rounded-2xl bg-card shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 id="titre-guide" className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          Guide du carnet
        </h3>
        <Button variant="ghost" size="sm" onClick={() => charger(true)} disabled={etat === "chargement"} aria-label="Régénérer le guide">
          {etat === "chargement" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
        </Button>
      </div>
      <p className="mt-2 text-foreground/85 leading-relaxed">{guide.resume}</p>

      {guide.sujets?.length > 0 && (
        <>
          <p className="etiquette mt-4 mb-2">Sujets clés</p>
          <ul className="flex flex-wrap gap-2">
            {guide.sujets.map((s) => (
              <li key={s.titre}>
                <button
                  type="button"
                  title={s.description || undefined}
                  onClick={() => onQuestion(`Explique-moi « ${s.titre} » à partir de mes sources.`)}
                  className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:brightness-95 min-h-[36px]"
                >
                  {s.titre}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {guide.questions?.length > 0 && (
        <>
          <p className="etiquette mt-4 mb-1">À explorer</p>
          <ul>
            {guide.questions.map((q, i) => (
              <li key={q} className={i > 0 ? "border-t border-border" : ""}>
                <button
                  type="button"
                  onClick={() => onQuestion(q)}
                  className="w-full flex items-center gap-3 py-2.5 text-left text-foreground hover:text-primary min-h-[44px]"
                >
                  <span className="flex-1">{q}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
