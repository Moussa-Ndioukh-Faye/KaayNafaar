import { useState, useEffect, useRef } from "react";
import { BookOpen, Plus, Search, Trash2, FileUp, X, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import { coursAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

const NIVEAUX = ["débutant", "intermédiaire", "avancé"];

// Couleurs de couvertures de cahiers : une par matière, toujours la même
const COUVERTURES = ["#0047db", "#c8372d", "#1f7a4d", "#d9621e", "#0a1f4a", "#7a3fa0"];
const couleurMatiere = (matiere = "") =>
  COUVERTURES[[...matiere].reduce((somme, c) => somme + c.charCodeAt(0), 0) % COUVERTURES.length];

/** Un cours = un cahier : couverture de couleur, reliure piquée, étiquette blanche */
function CouvertureCahier({ cours: c, onSupprimer }) {
  const couleur = couleurMatiere(c.matiere);
  const details = [c.niveau, c.dureeEstimee ? `${c.dureeEstimee} min` : null].filter(Boolean).join(" · ");
  return (
    <article
      className="group relative flex min-h-[10.5rem] rounded-md border border-encre/30 shadow-md overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg"
      style={{ backgroundColor: couleur }}
    >
      {/* Reliure : bande plus sombre, points de couture */}
      <div aria-hidden="true" className="w-6 shrink-0 bg-black/25 flex flex-col items-center justify-around py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="w-1 h-2.5 rounded-full bg-white/70" />
        ))}
      </div>
      <div className="flex-1 flex flex-col p-4">
        {/* Étiquette du cahier */}
        <div className="bg-card text-card-foreground rounded-[4px] border-[3px] border-double border-encre/40 px-4 py-3 shadow-sm">
          <p className="etiquette truncate">{c.matiere || "Matière"}</p>
          <h3 className="mt-0.5 text-lg leading-snug line-clamp-2">{c.titre}</h3>
          {details && <p className="mt-1 text-sm text-muted-foreground">{details}</p>}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between gap-2 text-white">
          <p className="text-sm text-white/90 line-clamp-1">
            {c.resumeIA ? "Résumé prêt" : Array.isArray(c.tags) && c.tags.length ? c.tags.join(", ") : ""}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Supprimer le cours ${c.titre}`}
            onClick={() => onSupprimer(c.id)}
            className="w-9 h-9 text-white hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}

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
  const [lien, setLien] = useState("");
  const [importLien, setImportLien] = useState(false);

  // Une page web (article, cours en ligne, PDF en ligne) devient un cours
  const importerDepuisLien = async (e) => {
    e.preventDefault();
    if (!lien.trim()) return;
    setImportLien(true);
    setErreur("");
    setSucces("");
    try {
      const { data } = await coursAPI.importerLien(lien.trim());
      setCours((l) => [data.cours, ...l]);
      setLien("");
      setSucces("Page importée : elle est maintenant dans tes cours.");
      setTimeout(() => setSucces(""), 4000);
    } catch (err) {
      setErreur(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Impossible d'importer cette page.");
    } finally {
      setImportLien(false);
    }
  };
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
          <h2 className="text-3xl md:text-4xl text-foreground">Mes cours</h2>
          <p className="annotation text-base mt-1">{cours.length} cours enregistrés dans ta bibliothèque</p>
        </div>
        {!afficherFormulaire && (
          <Button onClick={() => setAfficherFormulaire(true)} className="rounded-xl h-11 px-6 font-bold shadow-lg transition-transform active:scale-95">
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un cours
          </Button>
        )}
      </div>

      {/* Search and Feedback */}
      <form onSubmit={importerDepuisLien} className="flex flex-col sm:flex-row gap-2 sm:items-end max-w-2xl">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="lien-cours" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4" aria-hidden="true" />
            Importer une page web
          </label>
          <input
            id="lien-cours"
            type="url"
            inputMode="url"
            className="input-field"
            placeholder="https://… (article, cours en ligne, PDF)"
            value={lien}
            onChange={(e) => setLien(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={importLien || !lien.trim()}>
          {importLien ? "Import en cours…" : "Importer"}
        </Button>
      </form>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
          <input
            type="search"
            className="input-field pl-10 pr-4"
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
        <Card className="border-2 border-primary-100 dark:border-primary-900/30 shadow-md rounded-3xl overflow-hidden animate-slide-up">
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
                    className="input-field"
                    placeholder="ex: Introduction à l'Algorithmique" required
                    value={form.titre} maxLength={200}
                    onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-176" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Matière *</label>
                  <input id="mescours-champ-176"
                    className="input-field"
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
                  className="input-field h-40 resize-none"
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
                    className="input-field appearance-none"
                    value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                  >
                    {NIVEAUX.map((n) => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-210" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Durée estimée (min)</label>
                  <input id="mescours-champ-210" type="number" min="5" max="300" 
                    className="input-field"
                    value={form.dureeEstimee}
                    onChange={(e) => setForm({ ...form, dureeEstimee: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="mescours-champ-218" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Tags</label>
                  <input id="mescours-champ-218" 
                    className="input-field"
                    placeholder="tri, algo, mémoire" value={form.tags} maxLength={200}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="mescours-champ-228" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Fichier (PDF, Word, PowerPoint ou photo de notes)</label>
                <div className="flex items-center gap-4">
                  <input id="mescours-champ-228" ref={fileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f && f.size > 10 * 1024 * 1024) { setErreur("Fichier trop grand (max 10 Mo)."); return; }
                      setFichier(f || null);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl border-dashed border-2 h-20 flex-1 flex flex-col items-center justify-center gap-1 hover:border-primary-400 hover:bg-primary-50/30 transition-all">
                    <FileUp className={cn("w-5 h-5", fichier ? "text-primary-600" : "text-gray-500")} />
                    <span className="text-xs font-bold text-gray-500">
                      {fichier ? fichier.name : "PDF, Word, PowerPoint ou photo de notes"}
                    </span>
                    {!fichier && <span className="text-xs text-gray-500 uppercase tracking-tighter">Supporte les notes manuscrites</span>}
                  </Button>
                  {fichier && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Retirer le fichier" onClick={() => setFichier(null)} className="rounded-full text-red-700">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {coursFiltres.map((c) => (
            <CouvertureCahier key={c.id} cours={c} onSupprimer={supprimerCours} />
          ))}
        </div>
      )}
    </div>
  );
}
