import { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  Clock, 
  GraduationCap, 
  Tag, 
  FileUp, 
  X, 
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles
} from "lucide-react";
import { coursAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

const NIVEAUX = ["débutant", "intermédiaire", "avancé"];

export default function MesCours() {
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [form, setForm] = useState({
    titre: "", matiere: "", contenu: "", niveau: "intermédiaire",
    tags: "", dureeEstimee: 30,
  });
  const [fichier, setFichier] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const fileInputRef = useRef();

  useEffect(() => { chargerCours(); }, []);

  const chargerCours = async () => {
    try {
      const { data } = await coursAPI.getCours();
      setCours(data.cours ?? []);
    } catch (_) {
      setErreur("Impossible de charger les cours.");
    } finally {
      setChargement(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.matiere.trim() || !form.contenu.trim()) {
      setErreur("Titre, matière et contenu sont requis.");
      return;
    }
    setEnvoi(true);
    setErreur("");
    setSucces("");
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (fichier) formData.append("fichier", fichier);

      await coursAPI.creerCours(formData);
      setAfficherFormulaire(false);
      setForm({ titre: "", matiere: "", contenu: "", niveau: "intermédiaire", tags: "", dureeEstimee: 30 });
      setFichier(null);
      setSucces("Cours ajouté avec succès !");
      chargerCours();
      setTimeout(() => setSucces(""), 3000);
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la création.");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimerCours = async (id) => {
    if (!window.confirm("Supprimer ce cours ?")) return;
    try {
      await coursAPI.supprimerCours(id);
      setCours((prev) => prev.filter((c) => c.id !== id));
      setSucces("Cours supprimé.");
      setTimeout(() => setSucces(""), 3000);
    } catch (_) {
      setErreur("Impossible de supprimer.");
    }
  };

  const coursFiltres = cours.filter(
    (c) =>
      c.titre.toLowerCase().includes(recherche.toLowerCase()) ||
      c.matiere.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-600" />
            </div>
            Mes Cours
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{cours.length} cours enregistrés dans ta bibliothèque</p>
        </div>
        {!afficherFormulaire && (
          <Button onClick={() => setAfficherFormulaire(true)} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary-100 dark:shadow-none transition-transform active:scale-95">
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un cours
          </Button>
        )}
      </div>

      {/* Search and Feedback */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="search"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            placeholder="Rechercher par titre ou matière…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            maxLength={100}
          />
        </div>
        
        <div className="flex-1 flex gap-2">
          {erreur && (
            <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              {erreur}
            </div>
          )}
          {succes && (
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {succes}
            </div>
          )}
        </div>
      </div>

      {/* Form Section */}
      {afficherFormulaire && (
        <Card className="border-2 border-primary-100 dark:border-primary-900/30 shadow-xl rounded-3xl overflow-hidden animate-slide-up">
          <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">Nouveau cours</CardTitle>
                <CardDescription>Importe tes connaissances pour que l'IA puisse t'aider à réviser.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" aria-label="Fermer le formulaire" onClick={() => setAfficherFormulaire(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-167" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Titre du cours *</label>
                  <input id="mescours-champ-167"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="ex: Introduction à l'Algorithmique" required
                    value={form.titre} maxLength={200}
                    onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-176" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Matière *</label>
                  <input id="mescours-champ-176"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="ex: Informatique" required
                    value={form.matiere} maxLength={100}
                    onChange={(e) => setForm({ ...form, matiere: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="mescours-champ-187" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                  Contenu du cours * <span className="text-gray-500 font-normal">(Texte brut pour analyse IA)</span>
                </label>
                <textarea id="mescours-champ-187"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500 transition-all h-40 resize-none"
                  required
                  placeholder="Colle ici le texte de tes leçons ou notes…"
                  value={form.contenu} maxLength={50000}
                  onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-201" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Niveau</label>
                  <select id="mescours-champ-201" 
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
                    value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                  >
                    {NIVEAUX.map((n) => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-210" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Durée estimée (min)</label>
                  <input id="mescours-champ-210" type="number" min="5" max="300" 
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    value={form.dureeEstimee}
                    onChange={(e) => setForm({ ...form, dureeEstimee: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-218" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Tags</label>
                  <input id="mescours-champ-218" 
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="tri, algo, mémoire" value={form.tags} maxLength={200}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="mescours-champ-228" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Fichier (PDF ou Image pour OCR)</label>
                <div className="flex items-center gap-4">
                  <input id="mescours-champ-228" ref={fileInputRef} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f && f.size > 10 * 1024 * 1024) { setErreur("Fichier trop grand (max 10 Mo)."); return; }
                      setFichier(f || null);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl border-dashed border-2 h-20 flex-1 flex flex-col items-center justify-center gap-1 hover:border-primary-400 hover:bg-primary-50/30 transition-all">
                    <FileUp className={cn("w-5 h-5", fichier ? "text-primary-600" : "text-gray-500")} />
                    <span className="text-xs font-bold text-gray-500">
                      {fichier ? fichier.name : "PDF ou Photo de notes (OCR)"}
                    </span>
                    {!fichier && <span className="text-[9px] text-gray-500 uppercase tracking-tighter">Supporte les notes manuscrites</span>}
                  </Button>
                  {fichier && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Retirer le fichier" onClick={() => setFichier(null)} className="rounded-full text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50/50 dark:bg-gray-800/50 p-6 flex gap-3">
              <Button type="submit" disabled={envoi} className="flex-1 rounded-xl h-12 font-bold transition-transform active:scale-95">
                {envoi ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </div>
                ) : "Enregistrer le cours"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setAfficherFormulaire(false); setErreur(""); }} className="rounded-xl h-12 px-6 font-bold">
                Annuler
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Course List */}
      {chargement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : coursFiltres.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {recherche ? "Aucun résultat trouvé" : "Ta bibliothèque est vide"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
            {recherche ? "Essaie avec d'autres mots-clés." : "Commence par ajouter ton premier cours pour que l'IA puisse l'analyser."}
          </p>
          {!recherche && (
            <Button onClick={() => setAfficherFormulaire(true)} variant="outline" className="mt-6 rounded-xl font-bold">
              Ajouter un cours
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coursFiltres.map((c) => (
            <Card key={c.id} className="group relative rounded-3xl overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon" aria-label={`Supprimer le cours ${c.titre}`}
                    onClick={() => supprimerCours(c.id)}
                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CardTitle className="mt-4 text-lg font-bold truncate group-hover:text-primary-600 transition-colors">{c.titre}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-md">
                    {c.matiere}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md">
                    <GraduationCap className="w-3 h-3" />
                    {c.niveau}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-md">
                    <Clock className="w-3 h-3" />
                    {c.dureeEstimee} min
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                  {c.contenu}
                </p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between items-center">
                {c.tags?.length > 0 && (
                  <div className="flex gap-1">
                    <Tag className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
                      {Array.isArray(c.tags) ? c.tags.join(", ") : c.tags}
                    </span>
                  </div>
                )}
                {c.resumeIA && (
                  <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-secondary-50 dark:bg-secondary-900/20 rounded-lg">
                    <Sparkles className="w-3 h-3 text-secondary-600" />
                    <span className="text-[10px] font-bold text-secondary-600 uppercase">IA OK</span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
