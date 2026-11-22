import {
  FileText,
  Sparkles,
  Trash2,
  Download,
  Printer,
  BrainCircuit,
  ArrowLeft,
  BookOpen,
  Star,
  Key,
  MessageSquare,
  Globe,
  Lock as LockIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { enTexte } from "../../lib/texte";
import { exporterFichePro } from "../../utils/pdfPro";
import { imprimerFiche } from "../../utils/exportFiche";

/** Contenu complet d'une fiche : résumé, concepts, points clés, explications */
export default function DetailFiche({ fiche, onRetour, onPartager, onFlashcards, onSupprimer }) {
  const conceptsCles = fiche.contenu?.conceptsCles || [];
  const pointsImportants = fiche.contenu?.pointsImportants || [];
  const explications = fiche.contenu?.explications || {};

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onRetour} className="rounded-xl font-bold">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Toutes les fiches
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPartager(fiche)}
            className={cn(
              "rounded-xl font-bold transition-all",
              fiche.estPublique ? "bg-emerald-50 text-emerald-600 border-emerald-100" : ""
            )}
          >
            {fiche.estPublique ? (
              <Globe className="w-4 h-4 mr-2" />
            ) : (
              <LockIcon className="w-4 h-4 mr-2" />
            )}
            {fiche.estPublique ? "Partagée" : "Partager"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exporterFichePro(fiche)}
            className="rounded-xl font-bold"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => imprimerFiche(fiche)}
            className="rounded-xl font-bold"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          {fiche.flashcards?.length > 0 && (
            <Button
              size="sm"
              onClick={() => onFlashcards(fiche)}
              className="rounded-xl font-bold bg-primary-600"
            >
              <BrainCircuit className="w-4 h-4 mr-2" />
              Réviser
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSupprimer(fiche.id)}
            className="rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Fiche Content Card */}
      <Card className="rounded-[2rem] border-none shadow-xl shadow-gray-100 dark:shadow-none overflow-hidden bg-white dark:bg-gray-800">
        <div className="h-3 bg-gradient-to-r from-primary-600 via-secondary-400 to-primary-600" />
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-4">
            {fiche.genereeParIA && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-50 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-secondary-100 dark:border-secondary-900/50">
                <Sparkles className="w-3 h-3" />
                Générée par IA
              </div>
            )}
            {fiche.cours && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-primary-100 dark:border-primary-900/50">
                <BookOpen className="w-3 h-3" />
                {fiche.cours.titre}
              </div>
            )}
          </div>
          <CardTitle className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
            {fiche.titre}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-8 pt-4 space-y-10">
          {fiche.contenu?.resume && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-orange-600" />
                </div>
                Résumé synthétique
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base italic border-l-4 border-orange-200 dark:border-orange-900 pl-6">
                {fiche.contenu.resume}
              </p>
            </div>
          )}

          {conceptsCles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Key className="w-4 h-4 text-emerald-600" />
                </div>
                Concepts fondamentaux
              </h3>
              <div className="flex flex-wrap gap-2">
                {conceptsCles.map((c, i) => (
                  <span
                    key={`concept-${i}`}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold border border-gray-100 dark:border-gray-700"
                  >
                    {enTexte(c)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pointsImportants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary-600" />
                </div>
                Points à retenir
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pointsImportants.map((p, i) => (
                  <li
                    key={`point-${i}`}
                    className="flex gap-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 mt-0.5 font-black text-[10px] text-primary-600">
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {enTexte(p)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Object.keys(explications).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary-50 dark:bg-secondary-900/30 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-secondary-600" />
                </div>
                Explications détaillées
              </h3>
              <div className="grid gap-4">
                {Object.entries(explications).map(([nom, expl], i) => (
                  <div
                    key={`expl-${i}-${nom}`}
                    className="group p-6 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-3xl hover:border-primary-100 dark:hover:border-primary-900/30 transition-all"
                  >
                    <h4 className="font-black text-primary-600 dark:text-primary-400 mb-2 uppercase text-xs tracking-widest">
                      {nom}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {expl}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fiche.flashcards?.length > 0 && (
            <div className="pt-8 border-t border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                <BrainCircuit className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                Prêt pour une session flash ?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Tu as {fiche.flashcards.length} flashcards générées pour cette fiche.
              </p>
              <Button
                onClick={() => onFlashcards(fiche)}
                size="lg"
                className="rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 h-12 px-10"
              >
                Démarrer les flashcards
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
