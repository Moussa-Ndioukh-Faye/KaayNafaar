import { ArrowRight } from "lucide-react";

const SUGGESTIONS = [
  "Différence entre pile et file",
  "Complexité algorithmique ?",
  "Comment fonctionne la récursivité ?",
  "Techniques de mémorisation",
];

/** Écran affiché avant la première question : des sujets proposés, comme une liste d'exercices */
export default function EcranAccueil({ onSuggestion }) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-3xl md:text-4xl text-foreground">
        Pose ta <span className="surligne">question</span>.
      </h2>
      <p className="mt-2 text-muted-foreground">
        L'assistant s'appuie d'abord sur tes cours, puis sur le web si besoin, et cite ses sources.
      </p>

      <p className="annotation mt-6 mb-2">Par exemple :</p>
      <ol className="border-t border-encre/70 dark:border-foreground/40">
        {SUGGESTIONS.map((texte, i) => (
          <li key={texte} className="border-b border-border">
            <button
              type="button"
              onClick={() => onSuggestion(texte)}
              className="group w-full flex items-center gap-4 text-left px-1 py-3 hover:bg-secondary/25 transition-colors"
            >
              <span aria-hidden="true" className="chiffres w-6 text-sm font-semibold text-muted-foreground">
                {i + 1}.
              </span>
              <span className="flex-1 font-display text-lg text-foreground">{texte}</span>
              <ArrowRight
                className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
