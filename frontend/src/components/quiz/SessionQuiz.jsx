import { ArrowLeft, ArrowRight, CheckCircle2, Timer, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/** Déroulé d'un quiz, une question à la fois */
export default function SessionQuiz({
  quiz,
  session,
  onRepondre,
  onPrecedente,
  onSuivante,
  onTerminer,
  onQuitter,
}) {
  const question = quiz.questions[session.indexQuestion];
  const reponseDonnee = session.reponses[session.indexQuestion];
  const toutesRepondues = session.reponses.every((r) => r !== "");
  const progress = ((session.indexQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <div className="flex items-center justify-between px-2">
        <Button variant="ghost" onClick={onQuitter} className="rounded-xl font-bold">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quitter
        </Button>
        <div className="flex items-center gap-3">
          <Timer className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-black text-gray-500 uppercase tracking-widest">
            Question {session.indexQuestion + 1} / {quiz.questions.length}
          </span>
        </div>
      </div>

      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl border-none p-8 md:p-12 bg-white dark:bg-gray-800">
        <CardHeader className="p-0 mb-8">
          <div className="flex gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
              <HelpCircle className="w-7 h-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
            {question.question}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {question.type === "qcm" && question.options?.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {question.options.map((opt, i) => (
                <button
                  key={`opt-${i}`}
                  type="button"
                  aria-pressed={reponseDonnee === opt}
                  onClick={() => onRepondre(opt)}
                  className={cn(
                    "w-full text-left p-6 rounded-3xl border-2 transition-all duration-200 group flex items-center gap-4",
                    reponseDonnee === opt
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-100 dark:shadow-none"
                      : "border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-primary-200 dark:hover:border-primary-900/50"
                  )}
                >
                  <div
                    aria-hidden="true"
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-colors",
                      reponseDonnee === opt
                        ? "bg-primary-600 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-500 group-hover:text-primary-500"
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span
                    className={cn(
                      "flex-1 font-bold",
                      reponseDonnee === opt
                        ? "text-primary-900 dark:text-primary-100"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {opt}
                  </span>
                  {reponseDonnee === opt && (
                    <CheckCircle2 className="w-5 h-5 text-primary-600" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-[2rem] p-6 text-lg bg-gray-50 dark:bg-gray-900 outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/20 focus:border-primary-500 transition-all h-32 resize-none"
                placeholder="Écris ta réponse ici…"
                value={reponseDonnee}
                onChange={(e) => onRepondre(e.target.value)}
                maxLength={500}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          variant="outline"
          disabled={session.indexQuestion === 0}
          onClick={onPrecedente}
          className="flex-1 h-14 rounded-2xl font-black text-lg"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Précédente
        </Button>
        {session.indexQuestion < quiz.questions.length - 1 ? (
          <Button
            onClick={onSuivante}
            disabled={!reponseDonnee}
            className="flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary-200 dark:shadow-none"
          >
            Suivante
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={onTerminer}
            disabled={!toutesRepondues}
            className="flex-1 h-14 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Terminer
          </Button>
        )}
      </div>
    </div>
  );
}
