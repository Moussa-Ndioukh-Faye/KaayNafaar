import { Bot, Sparkles, Lightbulb, ChevronRight } from "lucide-react";

const SUGGESTIONS = [
  "Différence entre pile et file",
  "Complexité algorithmique ?",
  "Comment fonctionne la récursivité ?",
  "Techniques de mémorisation",
];

/** Écran affiché avant la première question, avec des suggestions */
export default function EcranAccueil({ onSuggestion }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-6" aria-hidden="true">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-[2.5rem] flex items-center justify-center animate-pulse">
          <Bot className="w-10 h-10 text-primary-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border border-gray-100 dark:border-gray-700">
          <Sparkles className="w-4 h-4 text-yellow-500" />
        </div>
      </div>
      <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Assistant Révision</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-10 font-medium">
        Ton tuteur personnel disponible 24/7 pour t'aider à réussir tes examens.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
        {SUGGESTIONS.map((texte) => (
          <button
            key={texte}
            type="button"
            onClick={() => onSuggestion(texte)}
            className="flex items-center gap-4 text-left p-5 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-3xl hover:border-primary-200 dark:hover:border-primary-800 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all group active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0" aria-hidden="true">
              <Lightbulb className="w-5 h-5 text-orange-500" />
            </div>
            <span className="flex-1 font-bold text-gray-700 dark:text-gray-300 text-sm leading-tight">{texte}</span>
            <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
