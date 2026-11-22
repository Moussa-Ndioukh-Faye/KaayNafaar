import { Sparkles, Trash2, Play, RotateCcw, Timer, HelpCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/** Carte d'un quiz dans la liste, avec le score de la dernière session */
export default function CarteQuiz({ quiz: q, onCommencer, onSupprimer }) {
  const derniereSession = q.sessions?.[q.sessions.length - 1];
  const score = derniereSession
    ? Math.round((derniereSession.score / derniereSession.total) * 100)
    : null;

  return (
    <Card className="group relative rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 hover:-translate-y-2 bg-white dark:bg-gray-800">
      <div
        className={cn(
          "h-3 w-full",
          score >= 80
            ? "bg-emerald-500"
            : score >= 50
              ? "bg-orange-500"
              : score !== null
                ? "bg-red-500"
                : "bg-gray-200 dark:bg-gray-700"
        )}
      />
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors">
              <HelpCircle className="w-6 h-6" />
            </div>
            {q.genereeParIA && (
              <div className="p-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSupprimer(q.id);
            }}
            aria-label={`Supprimer le quiz ${q.titre}`}
            className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
        <CardTitle className="mt-4 text-xl font-black leading-tight truncate group-hover:text-primary-600 transition-colors">
          {q.titre}
        </CardTitle>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-secondary-50 dark:bg-secondary-900/50 text-secondary-700 dark:text-secondary-300 rounded-md">
            {q.difficulte}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 rounded-md">
            <Timer className="w-3 h-3" /> {q.dureeMinutes} min
          </span>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md">
            {q.questions?.length} questions
          </span>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        {score !== null ? (
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-xs",
                score >= 80 ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
              )}
            >
              {score}%
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                Dernier essai
              </p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {derniereSession.score} / {derniereSession.total} bonnes réponses
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-300" />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
            <Play className="w-5 h-5 text-gray-200" />
            <p className="text-sm font-bold text-gray-300">Pas encore tenté</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          onClick={() => onCommencer(q)}
          className="w-full h-12 rounded-2xl font-black transition-transform active:scale-95 group-hover:shadow-lg group-hover:shadow-primary-100 dark:group-hover:shadow-none"
        >
          {derniereSession ? (
            <RotateCcw className="w-4 h-4 mr-2" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          {derniereSession ? "Refaire le quiz" : "Commencer le quiz"}
        </Button>
      </CardFooter>
    </Card>
  );
}
