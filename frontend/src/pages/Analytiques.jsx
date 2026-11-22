import { useEffect, useState } from "react";
import {
  BrainCircuit,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Target,
  Clock,
  BarChart3,
  AlertTriangle,
  Layers,
  Star,
  Activity,
  ChevronRight,
} from "lucide-react";
import api from "../services/api";
import { Card, CardContent} from "../components/ui/card";
import { cn } from "../lib/utils";

export default function Analytiques() {
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api.get("/analytics").then(({ data: res }) => {
      if (res.success) setData(res.analytics);
    }).catch(() => setErreur("Impossible de charger les analytiques."))
    .finally(() => setChargement(false));
  }, []);

  if (chargement) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
        {erreur}
      </div>
    );
  }

  if (!data) return null;

  const { progression, sm2, feedback, activite7Jours, pointsFaibles } = data;
  const maxActivite = Math.max(...activite7Jours.map(a => a.seances), 1);

  const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full border border-border bg-card rounded-2xl flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-primary-600" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Analytiques d'apprentissage</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Suis ta progression et identifie tes axes d'amélioration</p>
        </div>
      </div>

      {/* SM-2 Stats */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <BrainCircuit className="w-5 h-5 text-primary-600" />
          Mémoire & Révisions (SM-2)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center">
                  <Layers className="w-5 h-5 text-secondary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{sm2.totalFlashcards}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Flashcards</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{sm2.duesAujourdhui}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">À réviser</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{sm2.retention}%</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rétention</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{sm2.efMoyen}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Facilité moy.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SM-2 Progress bars */}
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                  <span>Maîtrisées</span>
                  <span>{sm2.maitrise} / {sm2.totalFlashcards}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${sm2.totalFlashcards ? (sm2.maitrise / sm2.totalFlashcards) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                  <span>En apprentissage</span>
                  <span>{sm2.enApprentissage} / {sm2.totalFlashcards}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${sm2.totalFlashcards ? (sm2.enApprentissage / sm2.totalFlashcards) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                  <span>Nouvelles / à réviser</span>
                  <span>{sm2.duesAujourdhui} / {sm2.totalFlashcards}</span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${sm2.totalFlashcards ? (sm2.duesAujourdhui / sm2.totalFlashcards) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Activité 7 jours */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          Activité récente (7 jours)
        </h3>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-end gap-3 h-40">
              {activite7Jours.map((jour, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="flex flex-col items-center gap-0.5">
                    {jour.quiz > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary-500" title={`${jour.quiz} quiz`} />
                    )}
                    {jour.seances > 0 && (
                      <div className="text-xs font-bold text-primary-600">{jour.seances}</div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "w-full rounded-lg transition-all duration-300",
                      jour.seances > 0 ? "bg-primary-500" : "bg-gray-100 dark:bg-gray-800"
                    )}
                    style={{ height: `${Math.max((jour.seances / maxActivite) * 120, 4)}px` }}
                  />
                  <span className="text-xs font-bold text-gray-500 uppercase">{jours[new Date(jour.date).getDay()]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Feedback + Progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feedback */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <ThumbsUp className="w-5 h-5 text-primary-600" />
            Retours utilisateur
          </h3>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{feedback.moyenne}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Moyenne /5</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{feedback.total}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total avis</p>
                </div>
              </div>
              {Object.keys(feedback.repartition).length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {Object.entries(feedback.repartition).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="flex-1 text-xs font-bold text-gray-600 dark:text-gray-400 capitalize">
                        {cat.replace(/_/g, " ")}
                      </span>
                      <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(count / feedback.total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-500 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Progression */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-primary-600" />
            Statistiques globales
          </h3>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-primary-600 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Cours</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progression.coursTotal}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Fiches</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progression.fichesTotal}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-secondary-600 mb-1">
                    <BrainCircuit className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Quiz</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progression.quizTotal}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-orange-700 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Score</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progression.scoreMoyenQuiz}%</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Série</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{progression.serie} jours</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 text-primary-600 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Temps total</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(progression.tempsRevisionTotal / 60)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Points faibles */}
      {pointsFaibles.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Axes d'amélioration détectés
          </h3>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {pointsFaibles.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                    <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
                      {p.type === "feedback" ? <ThumbsDown className="w-5 h-5 text-amber-600" /> : <BrainCircuit className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-amber-900 dark:text-amber-100 truncate">{p.sujet}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {p.type === "feedback" ? `${p.signalements} signalements` : `${p.signalements}/${p.total} cartes difficiles`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
