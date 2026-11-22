import { Trash2, Play, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

const DIFFICULTE = { facile: "Facile", moyen: "Moyen", difficile: "Difficile" };

/** Note sur 20, à la française (ex. 4/5 → 16) */
const noteSur20 = (score, total) => (total ? Math.round((score / total) * 200) / 10 : 0).toLocaleString("fr-FR");

/**
 * Un quiz présenté comme une copie d'examen : l'intitulé en tête,
 * et la note du dernier essai entourée à l'encre rouge, comme celle du professeur.
 */
export default function CarteQuiz({ quiz: q, onCommencer, onSupprimer }) {
  const derniereSession = q.sessions?.[q.sessions.length - 1];
  const nbQuestions = q.questions?.length || 0;

  return (
    <article className="group relative flex flex-col bg-card border border-border rounded-md shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4 px-5 pt-5">
        <div className="flex-1 min-w-0">
          <p className="etiquette">
            {DIFFICULTE[q.difficulte] || q.difficulte} · {nbQuestions} question{nbQuestions > 1 ? "s" : ""}
            {q.dureeMinutes ? ` · ${q.dureeMinutes} min` : ""}
          </p>
          <h3 className="mt-1.5 text-xl leading-snug text-foreground">{q.titre}</h3>
        </div>

        {derniereSession ? (
          <div
            className="relative shrink-0 w-[4.5rem] h-[4.5rem] -rotate-6 text-marge"
            role="img"
            aria-label={`Dernière note : ${noteSur20(derniereSession.score, derniereSession.total)} sur 20`}
          >
            <svg viewBox="0 0 72 72" className="absolute inset-0" aria-hidden="true">
              <path
                d="M36 5c17 0 31 13 31 30S53 67 35 67 5 54 6 36 19 4 38 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="font-display text-xl font-semibold chiffres">{noteSur20(derniereSession.score, derniereSession.total)}</span>
              <span className="text-xs font-semibold">/20</span>
            </span>
          </div>
        ) : (
          <p className="annotation text-sm shrink-0 mt-1 -rotate-3">Pas encore tenté</p>
        )}
      </div>

      {derniereSession && (
        <p className="px-5 mt-2 text-sm text-muted-foreground">
          Dernier essai : {derniereSession.score} bonne{derniereSession.score > 1 ? "s" : ""} réponse
          {derniereSession.score > 1 ? "s" : ""} sur {derniereSession.total}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 px-5 pt-5 pb-5">
        <Button onClick={() => onCommencer(q)} className="flex-1">
          {derniereSession ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
          {derniereSession ? "Refaire le quiz" : "Commencer le quiz"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onSupprimer(q.id);
          }}
          aria-label={`Supprimer le quiz ${q.titre}`}
          className="text-muted-foreground hover:text-marge hover:bg-marge/10"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
