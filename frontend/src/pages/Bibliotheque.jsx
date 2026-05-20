import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Globe,
  ChevronRight,
  Clock,
  Sparkles,
  Plus,
  Check,
  BookMarked,
  SlidersHorizontal,
  Library,
} from "lucide-react";
import { fichesAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useToast } from "@/hooks/use-toast";

const MATIERES = ["Informatique", "Mathématiques", "Physique", "Économie"];

const COULEURS_MATIERE = {
  Informatique: { bg: "bg-sky-50 dark:bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  Mathématiques: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500" },
  Physique: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  Économie: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
};

function CarteSquelette({ index }) {
  return (
    <div
      className="group rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse"
      style={{ animationDelay: `${index * 80}ms`, animationDuration: "1.5s" }}
    >
      <div className="p-6 space-y-4">
        <div className="flex justify-between">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="h-5 w-3/4 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-1/2 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full rounded bg-gray-50 dark:bg-gray-800/50" />
          <div className="h-3 w-5/6 rounded bg-gray-50 dark:bg-gray-800/50" />
          <div className="h-3 w-4/6 rounded bg-gray-50 dark:bg-gray-800/50" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-gray-800">
          <div className="h-8 w-8 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-4 w-20 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export default function Bibliotheque() {
  const { toast } = useToast();
  const [fiches, setFiches] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [search, setSearch] = useState("");
  const [matiere, setMatiere] = useState("");
  const [importIds, setImportIds] = useState(new Set());
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  useEffect(() => {
    chargerBibliotheque();
  }, []);

  const chargerBibliotheque = async () => {
    setChargement(true);
    try {
      const { data } = await fichesAPI.getFichesPubliques({ matiere: matiere || undefined, search: search || undefined });
      setFiches(data.fiches ?? []);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger la bibliothèque.", variant: "destructive" });
    } finally {
      setChargement(false);
    }
  };

  const importer = async (id, titre) => {
    try {
      await fichesAPI.importerFichePublique(id);
      setImportIds(prev => new Set(prev).add(id));
      toast({ title: "Fiche ajoutée", description: `"${titre}" est maintenant dans ta bibliothèque.` });
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'import.";
      toast({ title: "Import impossible", description: msg, variant: "destructive" });
    }
  };

  const filtrer = () => {
    chargerBibliotheque();
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30">
                <Library className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                <Globe className="w-3 h-3 text-indigo-500" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                Bibliothèque
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mt-0.5">
                Découvre les fiches partagées par la communauté
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-10 h-11 rounded-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-indigo-400 text-sm transition-all"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && filtrer()}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl border-gray-200 dark:border-gray-700"
            onClick={() => setFiltresOuverts(!filtresOuverts)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          <Button onClick={filtrer} className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            Rechercher
          </Button>
        </div>
      </div>

      {filtresOuverts && (
        <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mr-1">Matière</span>
          <button
            onClick={() => setMatiere("")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
              !matiere
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Toutes
          </button>
          {MATIERES.map((m) => (
            <button
              key={m}
              onClick={() => setMatiere(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                matiere === m
                  ? `${COULEURS_MATIERE[m].bg} ${COULEURS_MATIERE[m].text} shadow-sm`
                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {chargement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => <CarteSquelette key={i} index={i} />)}
        </div>
      ) : fiches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
              <BookMarked className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <Search className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Aucune fiche trouvée</h3>
          <p className="text-gray-400 dark:text-gray-500 max-w-md mt-2 text-sm leading-relaxed">
            {search || matiere
              ? "Essaie de modifier tes filtres ou de rechercher autre chose."
              : "Sois le premier à partager tes connaissances avec la communauté !"}
          </p>
          {(search || matiere) && (
            <Button
              variant="outline"
              className="mt-6 rounded-xl"
              onClick={() => { setSearch(""); setMatiere(""); }}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {fiches.map((fiche, index) => {
            const couleurs = COULEURS_MATIERE[fiche.matiere] || { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400" };
            const importee = importIds.has(fiche.id);

            return (
              <Card
                key={fiche.id}
                className="group relative rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/50 hover:shadow-xl hover:shadow-indigo-100/20 dark:hover:shadow-indigo-950/20 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${importee ? "bg-emerald-400" : "bg-gradient-to-r from-indigo-400 to-indigo-600 dark:from-indigo-500 dark:to-indigo-400"} opacity-60`} />

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${couleurs.bg} flex items-center justify-center`}>
                        <FileText className={`w-5 h-5 ${couleurs.text}`} />
                      </div>
                      {fiche.genereeParIA && (
                        <div className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-purple-500">IA</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`w-8 h-8 rounded-xl transition-all ${
                        importee
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
                          : "text-gray-300 dark:text-gray-600 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      }`}
                      onClick={() => !importee && importer(fiche.id, fiche.titre)}
                      disabled={importee}
                    >
                      {importee ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>

                  <CardTitle className="text-lg font-bold leading-snug text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {fiche.titre}
                  </CardTitle>

                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(fiche.createdAt).toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    {fiche.matiere && (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${couleurs.bg} ${couleurs.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${couleurs.dot}`} />
                        {fiche.matiere}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pb-2">
                  <div className="relative">
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                      {fiche.contenu?.resume || "Pas de résumé disponible."}
                    </p>
                    {fiche.contenu?.resume && fiche.contenu.resume.length > 120 && (
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-gray-50 dark:border-gray-800 px-6 pb-5 flex justify-between items-center">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {importee ? "✓ Dans ta bibliothèque" : "Ajouter à mes fiches"}
                  </span>
                  <Button
                    variant="ghost"
                    className="text-xs font-bold tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-transparent hover:text-indigo-700 dark:hover:text-indigo-300 hover:translate-x-0.5 transition-all flex items-center gap-1.5 px-0"
                  >
                    Lire <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {!chargement && fiches.length > 0 && (
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            {fiches.length} fiche{fiches.length > 1 ? "s" : ""} disponible{fiches.length > 1 ? "s" : ""} dans la bibliothèque
          </p>
        </div>
      )}
    </div>
  );
}
