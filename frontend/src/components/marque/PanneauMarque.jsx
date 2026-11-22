import { LogoComplet } from "./Logo";

const ATOUTS = [
  { titre: "Des fiches en quelques secondes", texte: "Un PDF ou une photo de ton cahier : l'IA en tire l'essentiel." },
  { titre: "Des quiz notés sur 20", texte: "Tirés de tes propres cours, avec la correction de chaque réponse." },
  { titre: "Un planning qui tient la route", texte: "Des révisions espacées, pour arriver serein le jour de l'examen." },
];

/** Panneau des pages de connexion et d'inscription (grand écran) : le tableau noir de la classe */
export default function PanneauMarque({ titre, accroche }) {
  return (
    <aside className="surface-marque relative hidden lg:flex lg:w-[46%] flex-col justify-between p-10 xl:p-14">
      <LogoComplet ton="clair" className="w-36" />

      <div className="relative max-w-md my-10 apparition">
        <h2 className="text-5xl xl:text-[3.5rem] leading-[1.04] text-papier">{titre}</h2>
        <p className="mt-5 text-lg text-papier/80">{accroche}</p>

        <ol className="mt-10 space-y-6">
          {ATOUTS.map((a, i) => (
            <li key={a.titre} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-papier/20 pt-5">
              <span className="font-display text-4xl leading-none text-surligneur chiffres" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <span className="block font-display text-xl text-papier">{a.titre}</span>
                <span className="block mt-1 text-papier/75">{a.texte}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Post-it épinglé au tableau */}
      <div className="self-end w-48 rotate-[4deg] bg-surligneur text-encre px-4 py-3 shadow-lg" aria-hidden="true">
        <p className="font-display italic text-lg leading-snug" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
          Conçu à Dakar, pour les étudiants d'Afrique et d'ailleurs.
        </p>
      </div>
    </aside>
  );
}
