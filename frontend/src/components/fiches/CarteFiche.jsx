import { Trash2, Download, Printer, ArrowRight, Globe, Layers } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { enTexte } from "../../lib/texte";
import { telechargerHTML, imprimerFiche } from "../../utils/exportFiche";

/**
 * Une fiche de révision : carte blanche, en-tête et aperçu des notions.
 */
export default function CarteFiche({ fiche, onOuvrir, onSupprimer }) {
  const concepts = fiche.contenu?.conceptsCles || [];
  const nbCartes = fiche.flashcards?.length || 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col bg-card rounded-2xl shadow-sm",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
      )}
    >
      {/* En-tête de la fiche */}
      <header className="px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <p className="etiquette truncate">{fiche.matiere || "Fiche de révision"}</p>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Supprimer la fiche ${fiche.titre}`}
            onClick={(e) => {
              e.stopPropagation();
              onSupprimer(fiche.id);
            }}
            className="w-8 h-8 -mr-2 text-muted-foreground hover:text-marge hover:bg-marge/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
        <h3 className="mt-1 text-xl leading-snug">
          <button
            type="button"
            onClick={() => onOuvrir(fiche)}
            className="text-left text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline underline-offset-4"
          >
            {fiche.titre}
          </button>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <time dateTime={fiche.createdAt} className="chiffres">
            {new Date(fiche.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </time>
          {nbCartes > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              {nbCartes} carte{nbCartes > 1 ? "s" : ""}
            </span>
          )}
          {fiche.estPublique && (
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              Partagée
            </span>
          )}
        </p>
      </header>

      {/* Corps : résumé */}
      <div className="flex-1 px-5 pt-3 pb-2 text-[0.95rem] leading-7 text-muted-foreground">
        <p className="line-clamp-3 min-h-[5.25rem]">{fiche.contenu?.resume || "Pas encore de résumé pour cette fiche."}</p>
        {concepts.length > 0 && (
          <p className="mt-1 line-clamp-1">
            {concepts.slice(0, 3).map((c, i) => (
              <span key={`cc-${i}`}>
                {i > 0 && <span className="text-muted-foreground"> · </span>}
                <span className="surligne font-medium">{enTexte(c)}</span>
              </span>
            ))}
            {concepts.length > 3 && <span className="text-muted-foreground"> · +{concepts.length - 3}</span>}
          </p>
        )}
      </div>

      {/* Pied : informations et actions */}
      <footer className="flex items-center gap-2 px-3 py-2.5 border-t border-border">
        <span className="mr-auto" />
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Télécharger la fiche ${fiche.titre}`}
          onClick={() => telechargerHTML(fiche)}
          className="w-9 h-9 text-muted-foreground hover:text-primary"
        >
          <Download aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Imprimer la fiche ${fiche.titre}`}
          onClick={() => imprimerFiche(fiche)}
          className="w-9 h-9 text-muted-foreground hover:text-primary"
        >
          <Printer aria-hidden="true" />
        </Button>
        <Button onClick={() => onOuvrir(fiche)} variant="ghost" size="sm" className="text-primary font-semibold">
          Ouvrir <ArrowRight aria-hidden="true" />
        </Button>
      </footer>
    </article>
  );
}
