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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-border bg-card rounded-xl flex items-center justify-center">
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

      <Card className="rounded-xl shadow-md overflow-hidden">
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
              className="input-field pl-4 pr-10 appearance-none"
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
              className="input-field h-32 resize-none"
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
                className="input-field appearance-none"
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
                className="input-field appearance-none"
                value={generation.difficulte}
                onChange={(e) => setGeneration({ ...generation, difficulte: e.target.value })}
              >
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-8 pt-0">
          <Button
            onClick={onLancer}
            disabled={enGeneration || !generation.contenu.trim()}
            className="w-full h-14 rounded-2xl font-bold text-lg"
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
        <Card className="rounded-3xl bg-gray-900 border-none shadow-lg overflow-hidden">
          <CardContent className="p-6">
            <pre className="text-xs text-emerald-400/80 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
              {texteStream}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
