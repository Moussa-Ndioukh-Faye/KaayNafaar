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
            className="shrink-0 rounded-xl bg-succes/15 px-3 py-2 text-center text-succes"
            role="img"
            aria-label={`Dernière note : ${noteSur20(derniereSession.score, derniereSession.total)} sur 20`}
          >
            <span aria-hidden="true" className="block text-xl font-bold leading-none chiffres">{noteSur20(derniereSession.score, derniereSession.total)}</span>
            <span aria-hidden="true" className="block text-xs font-semibold mt-0.5">/20</span>
          </div>
        ) : (
          <p className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Pas encore tenté</p>
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
