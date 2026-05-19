import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Globe, 
  BookOpen, 
  ChevronRight,
  Clock,
  Download,
  Printer,
  Sparkles,
  ArrowLeft,
  LayoutGrid,
  Heart,
  Plus,
  Check,
} from "lucide-react";
import { fichesAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function Bibliotheque() {
  const [fiches, setFiches] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [search, setSearch] = useState("");
  const [matiere, setMatiere] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [importIds, setImportIds] = useState(new Set());

  useEffect(() => {
    chargerBibliotheque();
  }, [matiere]);

  const chargerBibliotheque = async () => {
    setChargement(true);
    setErreur("");
    try {
      const { data } = await fichesAPI.getFichesPubliques({ matiere, search });
      setFiches(data.fiches ?? []);
    } catch (_) {
      setErreur("Impossible de charger la bibliothèque publique.");
    } finally {
      setChargement(false);
    }
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") chargerBibliotheque();
  };

  const importer = async (id) => {
    try {
      await fichesAPI.importerFichePublique(id);
      setImportIds(prev => new Set(prev).add(id));
      setMessage("Fiche ajoutée à ta bibliothèque !");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de l'import.";
      setErreur(msg);
      setTimeout(() => setErreur(""), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
              <Globe className="w-7 h-7 text-indigo-600" />
            </div>
            Bibliothèque Publique
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Découvre et révise avec les fiches partagées par la communauté.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input 
            className="pl-12 h-12 rounded-2xl border-2 border-gray-100 dark:border-gray-800 focus:border-indigo-500 transition-all bg-white dark:bg-gray-800"
            placeholder="Rechercher une fiche, un concept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
        <select 
          className="h-12 px-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          value={matiere}
          onChange={(e) => setMatiere(e.target.value)}
        >
          <option value="">Toutes les matières</option>
          <option value="Informatique">Informatique</option>
          <option value="Mathématiques">Mathématiques</option>
          <option value="Physique">Physique</option>
          <option value="Économie">Économie</option>
        </select>
        <Button onClick={chargerBibliotheque} className="h-12 px-8 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none">
          Filtrer
        </Button>
      </div>

      {erreur && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-sm font-bold border border-red-100">{erreur}</div>
      )}

      {message && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-sm font-bold border border-emerald-100 flex items-center gap-2">
          <Check className="w-4 h-4" /> {message}
        </div>
      )}

      {chargement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] animate-pulse" />
          ))}
        </div>
      ) : fiches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
           <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6">
              <LayoutGrid className="w-12 h-12 text-gray-200" />
           </div>
           <h3 className="text-xl font-black text-gray-900 dark:text-white">Aucune fiche publique</h3>
           <p className="text-gray-500 max-w-sm mt-2">Sois le premier à partager tes connaissances avec le monde !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fiches.map((fiche) => (
            <Card key={fiche.id} className="group relative rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:border-indigo-200 transition-all duration-500 hover:-translate-y-2 bg-white dark:bg-gray-800 border-2 border-transparent">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      {fiche.genereeParIA && (
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl" title="Générée par IA">
                           <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                   </div>
                   <Button variant="ghost" size="icon" className="text-gray-300 hover:text-red-500 rounded-full">
                      <Heart className="w-5 h-5" />
                   </Button>
                </div>
                <CardTitle className="text-xl font-black leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                   {fiche.titre}
                </CardTitle>
                <div className="flex items-center gap-4 mt-3">
                   <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(fiche.createdAt).toLocaleDateString("fr-FR")}
                   </div>
                   {fiche.matiere && (
                     <div className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-widest">
                        {fiche.matiere}
                     </div>
                   )}
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed min-h-[4.5rem]">
                  {fiche.contenu?.resume || "Pas de résumé disponible."}
                </p>
              </CardContent>

              <CardFooter className="pt-4 border-t border-gray-50 dark:border-gray-700 mx-6 mb-4 px-0 flex justify-between items-center">
                <div className="flex items-center gap-1">
                   <Button
                     variant="ghost"
                     size="icon"
                     className="w-9 h-9 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                     onClick={() => importer(fiche.id)}
                     disabled={importIds.has(fiche.id)}
                   >
                     {importIds.has(fiche.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                   </Button>
                </div>
                <Button 
                   variant="ghost" 
                   className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-transparent hover:translate-x-2 transition-all flex items-center gap-2"
                >
                   Consulter <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
