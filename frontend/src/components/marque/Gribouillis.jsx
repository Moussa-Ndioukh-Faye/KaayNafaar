import { cn } from "../../lib/utils";

/** Décorations dessinées à la main (purement décoratives, masquées aux lecteurs d'écran) */

export function Eclats({ className }) {
  return (
    <svg viewBox="0 0 60 60" className={cn("w-14 h-14 text-secondary-400", className)} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M8 34 L18 30" />
        <path d="M14 18 L22 24" />
        <path d="M28 8 L30 18" />
        <path d="M42 12 L38 22" />
        <path d="M52 26 L42 30" />
      </g>
    </svg>
  );
}

export function FlecheCourbe({ className }) {
  return (
    <svg viewBox="0 0 120 80" className={cn("w-28 h-auto text-primary-500", className)} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 70 C 30 20, 70 10, 108 18" strokeDasharray="5 7" />
        <path d="M96 8 L110 18 L97 28" />
      </g>
    </svg>
  );
}

export function Pointilles({ className }) {
  return (
    <svg viewBox="0 0 70 70" className={cn("w-16 h-16 text-secondary-400", className)} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        {Array.from({ length: 16 }).map((_, i) => (
          <circle key={i} cx={8 + (i % 4) * 18} cy={8 + Math.floor(i / 4) * 18} r={i % 3 === 0 ? 3 : 2} />
        ))}
      </g>
    </svg>
  );
}

/** Pastille ronde façon « badge » (ex. 1 235 cours) */
export function Pastille({ valeur, libelle, icone: Icone, className }) {
  return (
    <div
      className={cn(
        "relative grid place-items-center w-32 h-32 rounded-full bg-primary-600 text-white text-center",
        "ring-8 ring-white/80 dark:ring-white/10 shadow-[0_18px_40px_-18px_rgba(0,71,219,0.8)]",
        className
      )}
    >
      <div>
        {Icone && <Icone className="w-5 h-5 mx-auto mb-1 opacity-90" aria-hidden="true" />}
        <p className="font-display text-3xl font-bold leading-none tabular-nums">{valeur}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary-100">{libelle}</p>
      </div>
    </div>
  );
}
