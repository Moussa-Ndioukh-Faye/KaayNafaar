import { ChevronRight, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Différence entre pile et file",
  "Complexité algorithmique ?",
  "Comment fonctionne la récursivité ?",
  "Techniques de mémorisation",
];

/** Écran affiché avant la première question : des sujets proposés en liste groupée */
export default function EcranAccueil({ onSuggestion }) {
  return (
    <div className="max-w-2xl mx-auto py-8 text-center">
      <span aria-hidden="true" className="mx-auto grid place-items-center w-14 h-14 rounded-[16px] bg-[#5b4bdb] text-white shadow-md">
        <Sparkles className="w-7 h-7" />
      </span>
      <h2 className="mt-5 text-3xl md:text-4xl text-foreground">Pose ta question</h2>
      <p className="mt-2 text-muted-foreground">
        L'assistant s'appuie d'abord sur tes cours, puis sur le web si besoin, et cite ses sources.
      </p>

      <p className="etiquette mt-8 mb-2 px-4 text-left">Par exemple</p>
      <ul className="rounded-2xl bg-card shadow-sm overflow-hidden text-left">
        {SUGGESTIONS.map((texte, i) => (
          <li key={texte} className={i > 0 ? "border-t border-border" : ""}>
            <button
              type="button"
              onClick={() => onSuggestion(texte)}
              className="group w-full flex items-center gap-3 text-left px-4 py-3.5 min-h-[48px] hover:bg-foreground/[0.03] active:bg-foreground/[0.06] transition-colors"
            >
              <span className="flex-1 font-medium text-foreground">{texte}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/70" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
