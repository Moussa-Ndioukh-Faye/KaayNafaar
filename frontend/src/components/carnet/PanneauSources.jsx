import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

/**
 * Sources du carnet. La case cochée indique les sources utilisées pour répondre
 * et pour le studio (toutes par défaut) ; chaque source montre son résumé du guide.
 */
export default function PanneauSources({ carnet, guideSources = [], actives, changerActives, retirer, ouvrirAjout }) {
  const sources = carnet.sources || [];
  const resumes = new Map(guideSources.map((s) => [s.id, s]));
  const toutes = sources.length > 0 && sources.every((s) => actives.includes(s.id));

  return (
    <section aria-labelledby="titre-sources" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="titre-sources" className="text-xl">
          Sources <span className="text-muted-foreground font-normal">({sources.length})</span>
        </h3>
        <Button size="sm" variant="secondary" onClick={ouvrirAjout}>
          <Plus aria-hidden="true" />
          Ajouter
        </Button>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-sm p-5 text-center">
          <p className="text-muted-foreground">Ajoute des cours, des pages web ou cherche des sources sur un sujet.</p>
          <Button className="mt-3" onClick={ouvrirAjout}>
            <Plus aria-hidden="true" />
            Ajouter des sources
          </Button>
        </div>
      ) : (
        <>
          <label htmlFor="toutes-sources" className="flex items-center gap-3 px-1 text-sm text-muted-foreground cursor-pointer min-h-[40px]">
            <input
              id="toutes-sources"
              type="checkbox"
              className="w-5 h-5 accent-primary"
              checked={toutes}
              onChange={() => changerActives(toutes ? [] : sources.map((s) => s.id))}
            />
            Utiliser toutes les sources
          </label>
          <ul className="rounded-2xl bg-card shadow-sm overflow-hidden">
            {sources.map((s, i) => {
              const guide = resumes.get(s.id);
              return (
                <li key={s.id} className={cn("px-4 py-3", i > 0 && "border-t border-border")}>
                  <div className="flex items-start gap-3">
                    <input
                      id={`source-${s.id}`}
                      type="checkbox"
                      className="mt-0.5 w-5 h-5 accent-primary shrink-0"
                      checked={actives.includes(s.id)}
                      onChange={() =>
                        changerActives(actives.includes(s.id) ? actives.filter((x) => x !== s.id) : [...actives, s.id])
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`source-${s.id}`} className="block font-medium text-foreground leading-snug cursor-pointer">
                        {s.titre}
                      </label>
                      <p className="text-xs text-muted-foreground">{s.matiere}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-9 h-9 -mr-2 -mt-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Retirer ${s.titre} du carnet`}
                      onClick={() => retirer(s.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  {guide?.statut === "pret" && guide.resume && (
                    <details className="mt-2 ml-8 group">
                      <summary className="cursor-pointer text-sm text-primary list-none">Résumé de la source</summary>
                      <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{guide.resume}</p>
                      {guide.sujets?.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">{guide.sujets.join(" · ")}</p>
                      )}
                    </details>
                  )}
                  {guide?.statut === "en_attente" && (
                    <p role="status" className="mt-2 ml-8 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      Lecture de la source…
                    </p>
                  )}
                  {guide?.statut === "sans_texte" && (
                    <p className="mt-2 ml-8 text-xs text-destructive">Aucun texte lisible : réimporte le document.</p>
                  )}
                </li>
              );
            })}
          </ul>
          {actives.length === 0 && (
            <p role="alert" className="text-sm text-destructive px-1">
              Coche au moins une source pour poser une question.
            </p>
          )}
        </>
      )}
    </section>
  );
}
