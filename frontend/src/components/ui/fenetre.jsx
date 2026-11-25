import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Fenêtre modale accessible, construite sur <dialog> natif :
 * focus piégé, Échap pour fermer, titre annoncé (aria-labelledby).
 */
export function Fenetre({ ouverte, fermer, titre, sousTitre, children, pied, className, idTitre = "titre-fenetre" }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouverte && !d.open) d.showModal?.();
    if (!ouverte && d.open) d.close?.();
  }, [ouverte]);

  return (
    <dialog
      ref={ref}
      onClose={fermer}
      onCancel={fermer}
      aria-labelledby={idTitre}
      className={cn(
        "w-[calc(100%-1.5rem)] max-w-xl max-h-[min(90dvh,48rem)] bg-card text-card-foreground rounded-2xl shadow-2xl p-0 backdrop:bg-black/40",
        className
      )}
    >
      {ouverte && (
        <div className="flex flex-col max-h-[min(90dvh,48rem)]">
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-border">
            <div className="min-w-0">
              {sousTitre && <p className="etiquette">{sousTitre}</p>}
              <h2 id={idTitre} className="text-xl leading-snug">
                {titre}
              </h2>
            </div>
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="w-10 h-10 -mr-2 grid place-items-center rounded-full hover:bg-foreground/[0.06] shrink-0"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <div className="px-6 py-5 overflow-y-auto">{children}</div>
          {pied && <div className="px-6 py-4 border-t border-border flex flex-wrap justify-end gap-2">{pied}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Contrôle segmenté façon iOS (un seul choix), accessible : groupe de boutons aria-pressed */
export function ControleSegmente({ libelle, options, valeur, changer, className }) {
  return (
    <div role="group" aria-label={libelle} className={cn("flex flex-wrap rounded-[10px] bg-foreground/[0.07] p-[3px] gap-[2px]", className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valeur === o.id}
          onClick={() => changer(o.id)}
          className={cn(
            "flex-1 min-w-fit h-9 px-3 rounded-[8px] text-[0.8125rem] font-semibold transition-colors",
            valeur === o.id ? "bg-card text-foreground shadow-sm dark:bg-[#636366]" : "text-foreground/80 hover:text-foreground"
          )}
        >
          {o.nom}
        </button>
      ))}
    </div>
  );
}
