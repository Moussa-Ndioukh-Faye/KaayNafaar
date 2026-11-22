import {
  FileText,
  Sparkles,
  Trash2,
  Download,
  Printer,
  BrainCircuit,
  ChevronRight,
  Clock,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { enTexte } from "../../lib/texte";
import { telechargerHTML, imprimerFiche } from "../../utils/exportFiche";

/** Carte d'une fiche dans la liste */
export default function CarteFiche({ fiche, onOuvrir, onSupprimer }) {
  return (
    <Card className="group relative rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 hover:-translate-y-2 bg-white dark:bg-gray-800">
      <div className="h-2 w-full" style={{ backgroundColor: fiche.couleur || "#6366f1" }} />
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            {fiche.genereeParIA && (
              <div
                className="p-1.5 bg-secondary-50 dark:bg-secondary-900/30 text-secondary-600 rounded-lg"
                title="Générée par IA"
              >
                <Sparkles className="w-3 h-3" />
              </div>
            )}
            {fiche.estPublique && (
              <div
                className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"
                title="Publique"
              >
                <Globe className="w-3 h-3" />
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Supprimer la fiche ${fiche.titre}`}
            onClick={(e) => {
              e.stopPropagation();
              onSupprimer(fiche.id);
            }}
            className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <CardTitle className="text-lg font-black leading-tight truncate pr-4 group-hover:text-primary-600 transition-colors">
          {fiche.titre}
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
            <Clock className="w-3 h-3" />
            {new Date(fiche.createdAt).toLocaleDateString("fr-FR")}
          </div>
          {fiche.flashcards?.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <BrainCircuit className="w-3 h-3" />
              {fiche.flashcards.length} cards
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed min-h-[4.5rem]">
          {fiche.contenu?.resume || "Pas de résumé disponible pour cette fiche."}
        </p>
        {fiche.contenu?.conceptsCles?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {fiche.contenu.conceptsCles.slice(0, 2).map((c, i) => (
              <span
                key={`cc-${i}`}
                className="text-[9px] font-bold px-2 py-0.5 bg-gray-50 dark:bg-gray-900 text-gray-500 rounded-full border border-gray-100 dark:border-gray-700"
              >
                {enTexte(c)}
              </span>
            ))}
            {fiche.contenu.conceptsCles.length > 2 && (
              <span className="text-[9px] font-bold px-2 py-0.5 text-gray-300">
                +{fiche.contenu.conceptsCles.length - 2}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t border-gray-50 dark:border-gray-700 mt-2 flex justify-between items-center group-hover:bg-gray-50/50 dark:group-hover:bg-gray-900/30 transition-colors">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Télécharger la fiche ${fiche.titre}`}
            onClick={() => telechargerHTML(fiche)}
            className="w-8 h-8 rounded-lg text-gray-500 hover:text-primary-600"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Imprimer la fiche ${fiche.titre}`}
            onClick={() => imprimerFiche(fiche)}
            className="w-8 h-8 rounded-lg text-gray-500 hover:text-primary-600"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={() => onOuvrir(fiche)}
          variant="ghost"
          className="text-xs font-black uppercase tracking-widest text-primary-600 hover:bg-transparent hover:translate-x-1 transition-all"
        >
          Ouvrir <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
