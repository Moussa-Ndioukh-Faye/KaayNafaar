import { Sparkles, ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";

/** Formulaire de génération d'un quiz par l'IA */
export default function GenerationQuiz({
  cours,
  generation,
  setGeneration,
  onCoursChange,
  onLancer,
  onRetour,
  enGeneration,
  texteStream,
  erreur,
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onRetour} className="rounded-xl font-bold">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-secondary-600" />
          </div>
          Générer un quiz IA
        </h2>
      </div>

      {erreur && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          {erreur}
        </div>
      )}

      <Card className="rounded-[2rem] shadow-xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl">Paramètres du quiz</CardTitle>
          <CardDescription>
            L'IA va extraire des questions pertinentes basées sur ton cours.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="quiz-champ-382"
              className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1"
            >
              Choisir un cours
            </label>
            <select
              id="quiz-champ-382"
              className="w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
              onChange={onCoursChange}
              value={generation.coursId}
            >
              <option value="">-- Sélectionner un cours --</option>
              {cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="quiz-champ-394"
              className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1"
            >
              Contenu (Texte libre)
            </label>
            <textarea
              id="quiz-champ-394"
              className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all h-32 resize-none"
              placeholder="Ou colle le texte directement ici…"
              value={generation.contenu}
              maxLength={50000}
              onChange={(e) => setGeneration({ ...generation, contenu: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label
                htmlFor="quiz-champ-406"
                className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1"
              >
                Nombre de questions
              </label>
              <select
                id="quiz-champ-406"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none appearance-none"
                value={generation.nombreQuestions}
                onChange={(e) =>
                  setGeneration({ ...generation, nombreQuestions: parseInt(e.target.value) })
                }
              >
                {[3, 5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} questions
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="quiz-champ-416"
                className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1"
              >
                Difficulté
              </label>
              <select
                id="quiz-champ-416"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none appearance-none"
                value={generation.difficulte}
                onChange={(e) => setGeneration({ ...generation, difficulte: e.target.value })}
              >
                <option value="facile">Facile 🌱</option>
                <option value="moyen">Moyen 🧠</option>
                <option value="difficile">Difficile 🔥</option>
              </select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-8 pt-0">
          <Button
            onClick={onLancer}
            disabled={enGeneration || !generation.contenu.trim()}
            className="w-full h-14 rounded-2xl font-black text-lg"
          >
            {enGeneration ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                Extraction des questions...
              </div>
            ) : (
              <>
                <Sparkles className="w-6 h-6 mr-2" /> Créer mon quiz
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {texteStream && (
        <Card className="rounded-3xl bg-gray-900 border-none shadow-2xl overflow-hidden">
          <CardContent className="p-6">
            <pre className="text-[10px] text-emerald-400/80 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
              {texteStream}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
