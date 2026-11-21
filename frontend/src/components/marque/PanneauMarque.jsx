import Logo from "./Logo";

const ATOUTS = [
  { titre: "Des fiches en quelques secondes", texte: "Importe un PDF ou une photo de ton cahier, l'IA en tire l'essentiel." },
  { titre: "Des quiz qui s'adaptent", texte: "Flashcards et questions calées sur ce que tu maîtrises le moins." },
  { titre: "Un planning qui tient la route", texte: "Révisions espacées pour arriver serein le jour de l'examen." },
];

/** Panneau éditorial des pages de connexion et d'inscription (desktop) */
export default function PanneauMarque({ titre, accroche }) {
  return (
    <aside className="surface-teranga hidden lg:flex lg:w-[44%] flex-col justify-between p-12 xl:p-16">
      <Logo ton="clair" />

      <div className="max-w-md apparition">
        <h2 className="text-5xl xl:text-6xl font-semibold leading-[1.02]">{titre}</h2>
        <p className="mt-5 text-lg text-[#f3ead9]/85">{accroche}</p>

        <ol className="mt-12 space-y-7">
          {ATOUTS.map((a, i) => (
            <li key={a.titre} className="grid grid-cols-[auto_1fr] gap-5">
              <span className="w-12 font-display text-3xl font-semibold text-secondary-300 tabular-nums leading-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block font-bold text-[#fbf7ef]">{a.titre}</span>
                <span className="block mt-1 text-sm text-[#f3ead9]/75">{a.texte}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f3ead9]/60">
        Conçu à Dakar · pour les étudiants d'Afrique et d'ailleurs
      </p>
    </aside>
  );
}
