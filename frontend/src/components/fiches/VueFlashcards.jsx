import {
  BrainCircuit,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Meh,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useState } from "react";
import { fichesAPI } from "../../services/api";

/** Révision d'une fiche en flashcards (répétition espacée : cartes dues d'abord) */
export default function VueFlashcards({ fiche, onRetour, onFicheMiseAJour }) {
  const [indexFlashcard, setIndexFlashcard] = useState(0);
  const [reponseMontree, setReponseMontree] = useState(false);

  const flashcards = (fiche.flashcards || [])
    .map((fc, i) => ({ ...fc, _originalIndex: i }))
    .sort((a, b) => {
      const aDue = a.nextReview ? new Date(a.nextReview) : new Date(0);
      const bDue = b.nextReview ? new Date(b.nextReview) : new Date(0);
      return aDue - bDue;
    });
  const card = flashcards[indexFlashcard];
  const aReviser = flashcards.filter((fc) => {
    if (!fc.nextReview) return true;
    return new Date(fc.nextReview) <= new Date();
  }).length;

  const noterFlashcard = async (grade) => {
    try {
      const originalIdx = card._originalIndex;
      await fichesAPI.mettreAJourFlashcard(fiche.id, originalIdx, { grade });
      const { data } = await fichesAPI.getFiches();
      const miseAJour = data.fiches?.find((f) => f.id === fiche.id);
      if (miseAJour) onFicheMiseAJour(miseAJour);
    } catch (_) {}

    if (indexFlashcard < flashcards.length - 1) {
      setIndexFlashcard((i) => i + 1);
      setReponseMontree(false);
    } else {
      setIndexFlashcard(0);
      setReponseMontree(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onRetour} className="rounded-xl font-bold">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">
            Flashcards : {fiche.titre}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${((indexFlashcard + 1) / flashcards.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-500">
              {indexFlashcard + 1} / {flashcards.length}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <RefreshCw className="w-3 h-3 text-orange-700" />
            <span className="text-xs font-bold text-orange-700">{aReviser} à réviser</span>
          </div>
        </div>
      </div>

      {flashcards.length === 0 ? (
        <Card className="text-center py-20 border-dashed">
          <CardContent>
            <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune flashcard dans cette fiche.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="perspective-1000">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={reponseMontree}
            aria-describedby="consigne-flashcard"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                !reponseMontree && setReponseMontree(true);
              }
            }}
            className={cn(
              "relative h-80 w-full transition-all duration-500 transform-style-3d cursor-pointer",
              reponseMontree ? "rotate-y-180" : "",
              !reponseMontree ? "group" : ""
            )}
            onClick={() => !reponseMontree && setReponseMontree(true)}
          >
            <span id="consigne-flashcard" className="sr-only">
              {reponseMontree ? "Réponse affichée." : "Appuie pour voir la réponse."}
            </span>
            {/* Front side */}
            <Card
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 backface-hidden shadow-md rounded-xl border-2",
                reponseMontree ? "pointer-events-none opacity-0" : "opacity-100"
              )}
            >
              <span className="absolute top-6 left-6 text-xs font-bold uppercase tracking-[0.08em] text-primary-600/50 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-lg">
                Question
              </span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {card.question}
              </p>
              <div className="mt-10 text-gray-500 group-hover:text-primary-500 transition-colors flex items-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin-slow" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Clique pour voir la réponse
                </span>
              </div>
            </Card>

            {/* Back side */}
            <Card
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-emerald-50 dark:bg-emerald-900/10 backface-hidden shadow-md rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 transform rotate-y-180",
                reponseMontree ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <span className="absolute top-6 left-6 text-xs font-bold uppercase tracking-[0.08em] text-emerald-700/50 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">
                Réponse
              </span>
              <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed">
                {card.reponse}
              </p>
            </Card>
          </div>

          {reponseMontree && (
            <div className="mt-8 space-y-4">
              <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                Comment as-tu trouvé cette carte ?
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => noterFlashcard(1)}
                  variant="outline"
                  className="flex-1 max-w-[140px] h-14 rounded-2xl border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 group"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ThumbsDown className="w-5 h-5 text-red-700" />
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
                      Difficile
                    </span>
                  </div>
                </Button>
                <Button
                  onClick={() => noterFlashcard(3)}
                  variant="outline"
                  className="flex-1 max-w-[140px] h-14 rounded-2xl border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 group"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Meh className="w-5 h-5 text-amber-500" />
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                      Moyen
                    </span>
                  </div>
                </Button>
                <Button
                  onClick={() => noterFlashcard(5)}
                  variant="outline"
                  className="flex-1 max-w-[140px] h-14 rounded-2xl border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 group"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ThumbsUp className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                      Facile
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center mt-6">
            <Button
              variant="ghost"
              disabled={indexFlashcard === 0}
              onClick={() => {
                setIndexFlashcard((i) => i - 1);
                setReponseMontree(false);
              }}
              className="rounded-xl h-12 px-6 font-bold"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Précédente
            </Button>
            {indexFlashcard < flashcards.length - 1 ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setIndexFlashcard((i) => i + 1);
                  setReponseMontree(false);
                }}
                className="rounded-xl h-12 px-8 font-bold"
              >
                Passer
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => {
                  setIndexFlashcard(0);
                  setReponseMontree(false);
                }}
                className="rounded-xl h-12 px-8 font-bold text-emerald-700"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Recommencer
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
