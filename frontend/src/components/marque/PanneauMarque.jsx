import { LogoComplet } from "./Logo";

const ATOUTS = [
  { titre: "Des fiches en quelques secondes", texte: "Un PDF ou une photo de ton cahier : l'IA en tire l'essentiel." },
  { titre: "Des quiz notés sur 20", texte: "Tirés de tes propres cours, avec la correction de chaque réponse." },
  { titre: "Un planning qui tient la route", texte: "Des révisions espacées, pour arriver serein le jour de l'examen." },
];

/** Panneau des pages de connexion et d'inscription (grand écran) : surface de marque */
export default function PanneauMarque({ titre, accroche }) {
  return (
    <aside className="surface-marque relative hidden lg:flex lg:w-[46%] flex-col justify-between p-10 xl:p-14">
      <LogoComplet ton="clair" className="w-36" />

      <div className="relative max-w-md my-10 apparition">
        <h2 className="text-5xl xl:text-[3.5rem] leading-[1.04] text-white">{titre}</h2>
        <p className="mt-5 text-lg text-white/80">{accroche}</p>

        <ol className="mt-10 space-y-6">
          {ATOUTS.map((a, i) => (
            <li key={a.titre} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-white/15 pt-5">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-surligneur text-base font-bold text-[#1c1c1e] chiffres" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <span className="block text-lg font-semibold text-white">{a.titre}</span>
                <span className="block mt-1 text-white/75">{a.texte}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="inline-flex items-center gap-2.5 self-start rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15">
        <span className="bande-senegal w-6 rounded-full" aria-hidden="true" />
        Conçu à Dakar, pour les étudiants d'Afrique et d'ailleurs
      </p>
    </aside>
  );
}
