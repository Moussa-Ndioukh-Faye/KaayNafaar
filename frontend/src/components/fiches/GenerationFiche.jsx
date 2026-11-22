import { Sparkles, ArrowLeft, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";

/** Formulaire de génération d'une fiche par l'IA */
export default function GenerationFiche({
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
          Générer une fiche IA
        </h2>
      </div>

      {erreur && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 animate-fade-in"
          role="alert"
        >
          <AlertCircle className="w-4 h-4" />
          {erreur}
        </div>
      )}

      <Card className="rounded-[2rem] shadow-xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl">Configuration de la génération</CardTitle>
          <CardDescription>
            L'IA analysera ton cours pour créer une synthèse structurée et des flashcards.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label
                htmlFor="fiches-champ-606"
                className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1"
              >
                Cours source (optionnel)
              </label>
              <select
                id="fiches-champ-606"
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
                htmlFor="fiches-champ-617"
                className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1"
              >
                Titre de la fiche
              </label>
              <input
                id="fiches-champ-617"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="ex: Fiche - Algorithmes de tri"
                maxLength={200}
                value={generation.titre}
                onChange={(e) => setGeneration({ ...generation, titre: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="fiches-contenu"
              className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1"
            >
              Texte du cours à analyser *{" "}
              <span className="text-gray-500 font-normal">
                ({generation.contenu.length}/50 000)
              </span>
            </label>
            <textarea
              id="fiches-contenu"
              className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all h-64 resize-none"
              placeholder="Colle ici le contenu complet de ton cours…"
              value={generation.contenu}
              maxLength={50000}
              onChange={(e) => setGeneration({ ...generation, contenu: e.target.value })}
            />
          </div>
        </CardContent>
        <CardFooter className="p-8 pt-0 flex gap-4">
          <Button
            onClick={onLancer}
            disabled={enGeneration || !generation.contenu.trim()}
            className="flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary-200 dark:shadow-none transition-transform active:scale-95"
          >
            {enGeneration ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                Génération intelligente...
              </div>
            ) : (
              <>
                <Sparkles className="w-6 h-6 mr-2" /> Générer ma fiche
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {texteStream && (
        <Card className="rounded-3xl bg-gray-900 border-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-gray-800/50 p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                IA en direct
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <pre className="text-xs text-emerald-400/90 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
              {texteStream}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
