import {
  Sparkles,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  Trophy,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/** Message adapté au score (un 20 % n'est pas « avec brio ») */
const bilanDuScore = (pct) => {
  if (pct >= 80) return { titre: "Félicitations !", message: "Tu maîtrises ce chapitre." };
  if (pct >= 50) return { titre: "Bon travail !", message: "Encore quelques notions à revoir : regarde la correction." };
  return { titre: "Courage !", message: "Relis la correction puis refais le quiz : c'est comme ça qu'on progresse." };
};

/** Écran de fin de quiz : score et correction détaillée */
export default function ResultatQuiz({ quiz, resultat, onRecommencer, onRetour }) {
  const pct = resultat.pourcentage;
  const bilan = bilanDuScore(pct);
  const stats = [
    {
      label: "Score",
      value: `${resultat.score} / ${resultat.total}`,
      icon: Trophy,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      label: "Réussite",
      value: `${pct}%`,
      icon: BarChart3,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Questions",
      value: resultat.total,
      icon: HelpCircle,
      color: "text-primary-500",
      bg: "bg-primary-50 dark:bg-primary-900/20",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none text-center p-8 bg-white dark:bg-gray-800">
        <div className="flex justify-center mb-6">
          <div
            className={cn(
              "w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-lg",
              pct >= 80
                ? "bg-emerald-500 text-white"
                : pct >= 50
                  ? "bg-orange-500 text-white"
                  : "bg-red-500 text-white"
            )}
          >
            <Trophy className="w-12 h-12" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">{bilan.titre}</h2>
        <p className="text-gray-500 mt-2">{bilan.message}</p>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className={cn(
                "p-4 rounded-3xl border-2 border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all",
                s.bg
              )}
            >
              <s.icon className={cn("w-5 h-5 mx-auto mb-2", s.color)} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                {s.label}
              </p>
              <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-black text-gray-900 dark:text-white px-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Correction détaillée
        </h3>
        {quiz.questions.map((q, i) => {
          const rep = resultat.reponses[i];
          return (
            <Card
              key={`qcorr-${i}`}
              className={cn(
                "rounded-3xl border-2 transition-all",
                rep?.estCorrecte
                  ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-900/10"
                  : "border-red-100 dark:border-red-900/30 bg-red-50/20 dark:bg-red-900/10"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs",
                      rep?.estCorrecte ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white text-base">
                      {q.question}
                    </p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[9px] font-black uppercase text-gray-500 mb-1">
                          Ta réponse
                        </p>
                        <p
                          className={cn(
                            "text-sm font-bold",
                            rep?.estCorrecte ? "text-emerald-600" : "text-red-600"
                          )}
                        >
                          {rep?.reponseUtilisateur || "Pas de réponse"}
                        </p>
                      </div>
                      {!rep?.estCorrecte && (
                        <div className="p-3 bg-emerald-500 text-white rounded-2xl">
                          <p className="text-[9px] font-black uppercase text-emerald-100 mb-1">
                            Bonne réponse
                          </p>
                          <p className="text-sm font-bold">{q.reponseCorrecte}</p>
                        </div>
                      )}
                    </div>
                    {q.explication && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic flex items-start gap-2">
                          <Sparkles className="w-3 h-3 mt-0.5 text-primary-500 flex-shrink-0" />
                          {q.explication}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-4">
        <Button
          onClick={onRecommencer}
          className="flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary-200 dark:shadow-none"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Recommencer
        </Button>
        <Button
          onClick={onRetour}
          variant="outline"
          className="flex-1 h-14 rounded-2xl font-black text-lg"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour à la liste
        </Button>
      </div>
    </div>
  );
}
