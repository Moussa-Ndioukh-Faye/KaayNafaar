import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { installer, invitationDisponible, sAbonner, estInstallee, estIOS } from "../pwa";
import { cn } from "../lib/utils";

/**
 * « Installer l'application » : déclenche l'installation du navigateur (Android, Chrome, Edge)
 * ou, sur iPhone, explique les deux gestes nécessaires. Masqué si l'app est déjà installée.
 */
export default function BoutonInstaller({ variante = "contour", className }) {
  const disponible = useSyncExternalStore(sAbonner, invitationDisponible, () => false);
  const [aideIOS, setAideIOS] = useState(false);
  const [installee, setInstallee] = useState(false);
  const refDialogue = useRef(null);

  // Fenêtre native <dialog> : Échap, piège du focus et retour du focus gérés par le navigateur
  useEffect(() => {
    const d = refDialogue.current;
    if (!d) return;
    if (aideIOS && !d.open) d.showModal?.();
    if (!aideIOS && d.open) d.close?.();
  }, [aideIOS]);

  useEffect(() => setInstallee(estInstallee()), [disponible]);

  if (installee) return null;
  const ios = estIOS();
  if (!disponible && !ios) return null;

  const styles =
    variante === "lien"
      ? "inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary"
      : "btn-secondary h-12 px-6 text-base bg-card text-foreground";

  return (
    <>
      <button
        type="button"
        className={cn(styles, className)}
        onClick={() => (disponible ? installer() : setAideIOS(true))}
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        Installer l'application
      </button>

      {ios && (
        <dialog
          ref={refDialogue}
          aria-labelledby="titre-aide-ios"
          onClose={() => setAideIOS(false)}
          className="w-[calc(100%-2rem)] max-w-sm bg-card text-card-foreground border border-border rounded-lg shadow-xl p-6 backdrop:bg-encre/50"
        >
          <form method="dialog" className="absolute top-3 right-3">
            <button
              type="submit"
              aria-label="Fermer"
              className="w-9 h-9 grid place-items-center rounded-md hover:bg-foreground/[0.06]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </form>
          <h2 id="titre-aide-ios" className="text-2xl pr-8">Installer sur iPhone</h2>
          <ol className="mt-4 space-y-3 text-[0.95rem]">
            <li className="flex gap-3">
              <span className="font-display text-xl text-primary leading-none">1</span>
              <span>
                Touche <Share className="inline w-4 h-4 -mt-0.5" aria-label="Partager" /> <strong>Partager</strong> dans la barre de Safari.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-display text-xl text-primary leading-none">2</span>
              <span>
                Choisis <PlusSquare className="inline w-4 h-4 -mt-0.5" aria-hidden="true" /> <strong>Sur l'écran d'accueil</strong>, puis{" "}
                <strong>Ajouter</strong>.
              </span>
            </li>
          </ol>
        </dialog>
      )}
    </>
  );
}
