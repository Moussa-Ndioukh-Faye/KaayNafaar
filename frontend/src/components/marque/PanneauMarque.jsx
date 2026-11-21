import { Sparkles } from "lucide-react";
import { LogoComplet } from "./Logo";
import { Eclats, FlecheCourbe, Pointilles, Pastille } from "./Gribouillis";

const ATOUTS = [
  { titre: "Des fiches en quelques secondes", texte: "Importe un PDF ou une photo de ton cahier, l'IA en tire l'essentiel." },
  { titre: "Des quiz qui s'adaptent", texte: "Flashcards et questions calées sur ce que tu maîtrises le moins." },
  { titre: "Un planning qui tient la route", texte: "Révisions espacées pour arriver serein le jour de l'examen." },
];

/** Panneau de présentation des pages de connexion et d'inscription (desktop) */
export default function PanneauMarque({ titre, accroche }) {
  return (
    <aside className="fond-teinte relative hidden lg:flex lg:w-[46%] flex-col justify-between p-10 xl:p-14 overflow-hidden">
      <Pointilles className="absolute bottom-16 right-10 opacity-80" />

      <div className="flex items-start justify-between">
        <LogoComplet className="w-36" />
        <div className="relative mr-2 mt-2">
          <Pastille valeur="IA" libelle="à tes côtés" icone={Sparkles} className="w-28 h-28" />
          <Eclats className="absolute -top-5 -left-7 w-11 h-11 -rotate-45" />
        </div>
      </div>

      <div className="relative max-w-md apparition my-8">
        <h2 className="text-5xl xl:text-[3.4rem] font-bold leading-[1.08] text-marine dark:text-white">{titre}</h2>
        <p className="mt-5 text-lg text-gray-600 dark:text-gray-300">{accroche}</p>

        <ol className="mt-8 space-y-3">
          {ATOUTS.map((a, i) => (
            <li key={a.titre} className="flex gap-4 rounded-2xl bg-white/85 dark:bg-white/5 border border-border px-4 py-3 backdrop-blur-sm">
              <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-primary-600 text-white font-display font-bold">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold text-marine dark:text-white">{a.titre}</span>
                <span className="block mt-0.5 text-sm text-gray-600 dark:text-gray-300">{a.texte}</span>
              </span>
            </li>
          ))}
        </ol>

        <FlecheCourbe className="absolute -right-28 top-4 hidden xl:block" />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        Conçu à Dakar · pour les étudiants d'Afrique et d'ailleurs
      </p>
    </aside>
  );
}
