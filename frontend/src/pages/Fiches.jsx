import { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Sparkles, 
  Trash2, 
  Download, 
  Printer, 
  BrainCircuit, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw,
  BookOpen,
  Star,
  Key,
  MessageSquare,
  ChevronRight,
  Clock,
  Globe,
  Lock as LockIcon,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Meh,
  RefreshCw
} from "lucide-react";
import { fichesAPI, coursAPI, iaAPI } from "../services/api";
import { exporterFichePro } from "../utils/pdfPro";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { enTexte } from "../lib/texte";
import {} from "../components/ui/tooltip";

const escHtml = (str) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const genererHTMLFiche = (fiche) => {
  const dateStr = new Date(fiche.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const conceptsCles = (fiche.contenu?.conceptsCles || [])
    .map((c) => `<span class="badge">${escHtml(enTexte(c))}</span>`).join("");

  const pointsImportants = (fiche.contenu?.pointsImportants || [])
    .map((p) => `<li>${escHtml(enTexte(p))}</li>`).join("");

  const explications = Object.entries(fiche.contenu?.explications || {})
    .map(([nom, expl]) => `
      <div class="concept-card">
        <h4>${escHtml(nom)}</h4>
        <p>${escHtml(expl)}</p>
      </div>`).join("");

  const flashcards = (fiche.flashcards || [])
    .map((fc) => `
      <div class="flashcard">
        <div class="question">❓ ${escHtml(fc.question)}</div>
        <div class="reponse">✅ ${escHtml(fc.reponse)}</div>
      </div>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(fiche.titre)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #f9fafb; padding: 2rem; max-width: 900px; margin: 0 auto; }
    header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
    header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    header .meta { font-size: 0.9rem; opacity: 0.85; }
    section { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #4f46e5; }
    h2 { color: #4f46e5; font-size: 1.1rem; margin-bottom: 1rem; }
    p { line-height: 1.7; color: #374151; }
    .badge { display: inline-block; background: #eef2ff; color: #4f46e5; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.8rem; margin: 0.2rem; font-weight: 500; }
    ul { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; line-height: 1.6; }
    .concept-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
    .concept-card h4 { color: #4f46e5; margin-bottom: 0.4rem; font-size: 0.95rem; font-weight: 600; }
    .flashcard { border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 0.8rem; overflow: hidden; }
    .flashcard .question { background: #eef2ff; padding: 0.8rem 1rem; font-weight: 500; color: #1e1b4b; display: flex; align-items: center; gap: 0.5rem; }
    .flashcard .reponse { background: #f0fdf4; padding: 0.8rem 1rem; color: #14532d; display: flex; align-items: center; gap: 0.5rem; }
    footer { text-align: center; color: #9ca3af; font-size: 0.8rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
    @media print {
      body { background: white; padding: 1rem; }
      section { box-shadow: none; break-inside: avoid; }
      header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escHtml(fiche.titre)}</h1>
    <div class="meta">
      ${fiche.cours ? `📚 ${escHtml(fiche.cours.titre)} · ` : ""}Créée le ${dateStr}${fiche.genereeParIA ? " · ✨ Générée par IA" : ""}
    </div>
  </header>

  ${fiche.contenu?.resume ? `<section><h2>📝 Résumé</h2><p>${escHtml(fiche.contenu.resume)}</p></section>` : ""}
  ${conceptsCles ? `<section><h2>🔑 Concepts clés</h2><div>${conceptsCles}</div></section>` : ""}
  ${pointsImportants ? `<section><h2>⭐ Points importants</h2><ul>${pointsImportants}</ul></section>` : ""}
  ${explications ? `<section><h2>📖 Explications détaillées</h2>${explications}</section>` : ""}
  ${flashcards ? `<section><h2>🃏 Flashcards (${fiche.flashcards.length})</h2>${flashcards}</section>` : ""}

  <footer>Fiche de révision · Kaay Nafaar · ${new Date().getFullYear()}</footer>
</body>
</html>`;
};

const telechargerHTML = (fiche) => {
  const html = genererHTMLFiche(fiche);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fiche-${fiche.titre.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

const imprimerFiche = (fiche) => {
  const html = genererHTMLFiche(fiche);
  const fenetre = window.open("", "_blank", "width=960,height=750");
  if (!fenetre) return;
  fenetre.document.write(html);
  fenetre.document.close();
  fenetre.focus();
  setTimeout(() => fenetre.print(), 400);
};

export default function Fiches() {
  const [fiches, setFiches] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState("liste");
  const [ficheSelectionnee, setFicheSelectionnee] = useState(null);
  const [generation, setGeneration] = useState({ coursId: "", contenu: "", titre: "" });
  const [enGeneration, setEnGeneration] = useState(false);
  const [texteStream, setTexteStream] = useState("");
  const [erreur, setErreur] = useState("");
  const [indexFlashcard, setIndexFlashcard] = useState(0);
  const [reponseMontree, setReponseMontree] = useState(false);
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => controllerRef.current?.abort?.();
  }, []);

  useEffect(() => {
    const charger = async () => {
      try {
        const [f, c] = await Promise.all([fichesAPI.getFiches(), coursAPI.getCours()]);
        setFiches(f.data.fiches ?? []);
        setCours(c.data.cours ?? []);
      } catch (_) {
        setErreur("Impossible de charger les données.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const handleCoursChange = (e) => {
    const coursId = e.target.value;
    // La valeur d'un <select> est toujours une chaîne : on compare des chaînes
    const c = cours.find((x) => String(x.id) === coursId);
    setGeneration({ coursId, contenu: c?.contenu || "", titre: c?.titre ? `Fiche - ${c.titre}` : "" });
  };

  const lancerGeneration = () => {
    if (!generation.contenu.trim()) { setErreur("Veuillez fournir un contenu de cours."); return; }
    setEnGeneration(true);
    setTexteStream("");
    setErreur("");

    controllerRef.current = iaAPI.genererFicheStream(
      { contenuCours: generation.contenu, titreCours: generation.titre, coursId: generation.coursId || undefined },
      (delta) => setTexteStream((prev) => prev + delta),
      () => {
        setEnGeneration(false);
        fichesAPI.getFiches().then(({ data }) => setFiches(data.fiches ?? [])).catch(() => {});
        setVue("liste");
        setTexteStream("");
      },
      (err) => { setErreur(err || "Erreur de génération."); setEnGeneration(false); }
    );
  };

  const supprimerFiche = async (id) => {
    if (!window.confirm("Supprimer cette fiche ?")) return;
    try {
      await fichesAPI.supprimerFiche(id);
      setFiches((prev) => prev.filter((f) => f.id !== id));
      if (ficheSelectionnee?.id === id) setVue("liste");
    } catch (_) {
      setErreur("Impossible de supprimer la fiche.");
    }
  };

  const ouvrirDetail = (fiche) => { setFicheSelectionnee(fiche); setVue("detail"); };
  const ouvrirFlashcards = (fiche) => {
    setFicheSelectionnee(fiche);
    setIndexFlashcard(0);
    setReponseMontree(false);
    setVue("flashcards");
  };

  const basculerVisibilite = async (fiche) => {
    try {
      const nouvelleValeur = !fiche.estPublique;
      await fichesAPI.modifierFiche(fiche.id, { estPublique: nouvelleValeur });
      setFicheSelectionnee({ ...fiche, estPublique: nouvelleValeur });
      setFiches(prev => prev.map(f => f.id === fiche.id ? { ...f, estPublique: nouvelleValeur } : f));
      
      if (nouvelleValeur) {
        const url = `${window.location.origin}/bibliotheque?fiche=${fiche.id}`;
        try {
          await navigator.clipboard.writeText(url);
        } catch (_) {
          // Clipboard non disponible, lien affiché dans la console
        }
        setErreur("");
      }
    } catch (_) {
      setErreur("Erreur lors de la modification de la visibilité.");
    }
  };

  if (vue === "flashcards" && ficheSelectionnee) {
    const flashcards = (ficheSelectionnee.flashcards || [])
      .map((fc, i) => ({ ...fc, _originalIndex: i }))
      .sort((a, b) => {
        const aDue = a.nextReview ? new Date(a.nextReview) : new Date(0);
        const bDue = b.nextReview ? new Date(b.nextReview) : new Date(0);
        return aDue - bDue;
      });
    const card = flashcards[indexFlashcard];
    const aReviser = flashcards.filter(fc => {
      if (!fc.nextReview) return true;
      return new Date(fc.nextReview) <= new Date();
    }).length;

    const noterFlashcard = async (grade) => {
      try {
        const originalIdx = card._originalIndex;
        await fichesAPI.mettreAJourFlashcard(ficheSelectionnee.id, originalIdx, { grade });
        const { data } = await fichesAPI.getFiches();
        const miseAJour = data.fiches?.find(f => f.id === ficheSelectionnee.id);
        if (miseAJour) setFicheSelectionnee(miseAJour);
      } catch (_) {}

      if (indexFlashcard < flashcards.length - 1) {
        setIndexFlashcard(i => i + 1);
        setReponseMontree(false);
      } else {
        setIndexFlashcard(0);
        setReponseMontree(false);
      }
    };

    return (
      <div className="max-w-2xl mx-auto space-y-8 pb-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setVue("detail")} className="rounded-xl font-bold">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
          <div className="flex-1">
             <h2 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">
                Flashcards : {ficheSelectionnee.titre}
             </h2>
             <div className="flex items-center gap-2 mt-0.5">
                <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-primary-600 transition-all duration-300" 
                      style={{ width: `${((indexFlashcard + 1) / flashcards.length) * 100}%` }}
                   />
                </div>
                <span className="text-xs font-bold text-gray-500">{indexFlashcard + 1} / {flashcards.length}</span>
             </div>
             <div className="flex items-center gap-1 mt-1">
                <RefreshCw className="w-3 h-3 text-orange-500" />
                <span className="text-[10px] font-bold text-orange-500">{aReviser} à réviser</span>
             </div>
          </div>
        </div>

        {flashcards.length === 0 ? (
          <Card className="text-center py-20 border-dashed">
            <CardContent>
              <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucune flashcard dans cette fiche.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="perspective-1000">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={reponseMontree}
              aria-describedby="consigne-flashcard"
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); !reponseMontree && setReponseMontree(true); } }}
              className={cn(
                "relative h-80 w-full transition-all duration-500 transform-style-3d cursor-pointer",
                reponseMontree ? "rotate-y-180" : "",
                !reponseMontree ? "group" : ""
              )}
              onClick={() => !reponseMontree && setReponseMontree(true)}
            >
              <span id="consigne-flashcard" className="sr-only">
                {reponseMontree ? "Réponse affichée." : "Appuie pour voir la réponse."}
              </span>
              {/* Front side */}
              <Card className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 backface-hidden shadow-xl rounded-[2rem] border-2",
                reponseMontree ? "pointer-events-none opacity-0" : "opacity-100"
              )}>
                 <span className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-widest text-primary-600/50 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-lg">Question</span>
                 <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{card.question}</p>
                 <div className="mt-10 text-gray-500 group-hover:text-primary-500 transition-colors flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 animate-spin-slow" />
                    <span className="text-xs font-bold uppercase tracking-wider">Clique pour voir la réponse</span>
                 </div>
              </Card>

              {/* Back side */}
              <Card className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-emerald-50 dark:bg-emerald-900/10 backface-hidden shadow-xl rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-900/30 transform rotate-y-180",
                reponseMontree ? "opacity-100" : "pointer-events-none opacity-0"
              )}>
                 <span className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-widest text-emerald-600/50 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">Réponse</span>
                 <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed">{card.reponse}</p>
              </Card>
            </div>

            {reponseMontree && (
              <div className="mt-8 space-y-4">
                <p className="text-center text-sm font-bold text-gray-500 dark:text-gray-400">Comment as-tu trouvé cette carte ?</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => noterFlashcard(1)}
                    variant="outline"
                    className="flex-1 max-w-[140px] h-14 rounded-2xl border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 group"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <ThumbsDown className="w-5 h-5 text-red-500" />
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Difficile</span>
                    </div>
                  </Button>
                  <Button
                    onClick={() => noterFlashcard(3)}
                    variant="outline"
                    className="flex-1 max-w-[140px] h-14 rounded-2xl border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 group"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Meh className="w-5 h-5 text-amber-500" />
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Moyen</span>
                    </div>
                  </Button>
                  <Button
                    onClick={() => noterFlashcard(5)}
                    variant="outline"
                    className="flex-1 max-w-[140px] h-14 rounded-2xl border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 group"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <ThumbsUp className="w-5 h-5 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Facile</span>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center mt-6">
              <Button 
                variant="ghost"
                disabled={indexFlashcard === 0}
                onClick={() => { setIndexFlashcard((i) => i - 1); setReponseMontree(false); }}
                className="rounded-xl h-12 px-6 font-bold"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Précédente
              </Button>
              {indexFlashcard < flashcards.length - 1 ? (
                <Button 
                  variant="ghost"
                  onClick={() => { setIndexFlashcard((i) => i + 1); setReponseMontree(false); }} 
                  className="rounded-xl h-12 px-8 font-bold"
                >
                  Passer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button 
                  variant="ghost"
                  onClick={() => { setIndexFlashcard(0); setReponseMontree(false); }} 
                  className="rounded-xl h-12 px-8 font-bold text-emerald-600"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Recommencer
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (vue === "detail" && ficheSelectionnee) {
    const fiche = ficheSelectionnee;
    const conceptsCles = fiche.contenu?.conceptsCles || [];
    const pointsImportants = fiche.contenu?.pointsImportants || [];
    const explications = fiche.contenu?.explications || {};

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setVue("liste")} className="rounded-xl font-bold">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Toutes les fiches
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
               variant="outline" 
               size="sm" 
               onClick={() => basculerVisibilite(fiche)} 
               className={cn("rounded-xl font-bold transition-all", fiche.estPublique ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "")}
            >
              {fiche.estPublique ? <Globe className="w-4 h-4 mr-2" /> : <LockIcon className="w-4 h-4 mr-2" />}
              {fiche.estPublique ? "Partagée" : "Partager"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exporterFichePro(fiche)} className="rounded-xl font-bold">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => imprimerFiche(fiche)} className="rounded-xl font-bold">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            {fiche.flashcards?.length > 0 && (
              <Button size="sm" onClick={() => ouvrirFlashcards(fiche)} className="rounded-xl font-bold bg-primary-600">
                <BrainCircuit className="w-4 h-4 mr-2" />
                Réviser
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => supprimerFiche(fiche.id)} className="rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
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
                    <span key={`concept-${i}`} className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold border border-gray-100 dark:border-gray-700">
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
                    <li key={`point-${i}`} className="flex gap-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 mt-0.5 font-black text-[10px] text-primary-600">
                         {i + 1}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{enTexte(p)}</span>
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
                    <div key={`expl-${i}-${nom}`} className="group p-6 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-3xl hover:border-primary-100 dark:hover:border-primary-900/30 transition-all">
                      <h4 className="font-black text-primary-600 dark:text-primary-400 mb-2 uppercase text-xs tracking-widest">{nom}</h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{expl}</p>
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
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Prêt pour une session flash ?</h3>
                <p className="text-sm text-gray-500 mb-6">Tu as {fiche.flashcards.length} flashcards générées pour cette fiche.</p>
                <Button onClick={() => ouvrirFlashcards(fiche)} size="lg" className="rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 h-12 px-10">
                   Démarrer les flashcards
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vue === "generer") {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        <div className="flex items-center gap-4">
          <Button 
             variant="ghost" 
             onClick={() => { setVue("liste"); setTexteStream(""); setEnGeneration(false); controllerRef.current?.abort?.(); }}
             className="rounded-xl font-bold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
             <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-secondary-600" />
             </div>
             Générer une fiche IA
          </h2>
        </div>

        {erreur && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 animate-fade-in" role="alert">
             <AlertCircle className="w-4 h-4" />
             {erreur}
          </div>
        )}

        <Card className="rounded-[2rem] shadow-xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
             <CardTitle className="text-xl">Configuration de la génération</CardTitle>
             <CardDescription>L'IA analysera ton cours pour créer une synthèse structurée et des flashcards.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label htmlFor="fiches-champ-606" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Cours source (optionnel)</label>
                 <select id="fiches-champ-606" 
                    className="w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none" 
                    onChange={handleCoursChange} 
                    value={generation.coursId}
                 >
                   <option value="">-- Sélectionner un cours --</option>
                   {cours.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
                 </select>
               </div>
               <div className="space-y-2">
                 <label htmlFor="fiches-champ-617" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Titre de la fiche</label>
                 <input id="fiches-champ-617" 
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                    placeholder="ex: Fiche - Algorithmes de tri" 
                    maxLength={200}
                    value={generation.titre}
                    onChange={(e) => setGeneration({ ...generation, titre: e.target.value })}
                 />
               </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="fiches-contenu" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
                Texte du cours à analyser * <span className="text-gray-500 font-normal">({generation.contenu.length}/50 000)</span>
              </label>
              <textarea
                id="fiches-contenu"
                className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all h-64 resize-none" 
                placeholder="Colle ici le contenu complet de ton cours…"
                value={generation.contenu} 
                maxLength={50000}
                onChange={(e) => setGeneration({ ...generation, contenu: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0 flex gap-4">
            <Button
              onClick={lancerGeneration}
              disabled={enGeneration || !generation.contenu.trim()}
              className="flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary-200 dark:shadow-none transition-transform active:scale-95"
            >
              {enGeneration ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Génération intelligente...
                </div>
              ) : (
                <><Sparkles className="w-6 h-6 mr-2" /> Générer ma fiche</>
              )}
            </Button>
          </CardFooter>
        </Card>

        {texteStream && (
          <Card className="rounded-3xl bg-gray-900 border-none shadow-2xl overflow-hidden">
             <CardHeader className="bg-gray-800/50 p-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">IA en direct</span>
                </div>
             </CardHeader>
             <CardContent className="p-6">
                <pre className="text-xs text-emerald-400/90 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                   {texteStream}
                </pre>
             </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            Mes Fiches
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{fiches.length} fiches de révision structurées</p>
        </div>
        <Button onClick={() => setVue("generer")} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary-100 dark:shadow-none transition-transform active:scale-95">
          <Sparkles className="w-5 h-5 mr-2" />
          Générer avec IA
        </Button>
      </div>

      {erreur && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm animate-fade-in" role="alert">{erreur}</div>
      )}

      {chargement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
             <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : fiches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Aucune fiche disponible</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">Transforme tes cours en fiches de synthèse intelligentes pour réviser plus efficacement.</p>
          <Button onClick={() => setVue("generer")} variant="outline" className="mt-6 rounded-xl font-bold">
            <Sparkles className="w-4 h-4 mr-2" />
            Générer ma première fiche
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fiches.map((fiche) => (
            <Card key={fiche.id} className="group relative rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 hover:-translate-y-2 bg-white dark:bg-gray-800">
              <div 
                 className="h-2 w-full" 
                 style={{ backgroundColor: fiche.couleur || "#6366f1" }} 
              />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      {fiche.genereeParIA && (
                        <div className="p-1.5 bg-secondary-50 dark:bg-secondary-900/30 text-secondary-600 rounded-lg" title="Générée par IA">
                           <Sparkles className="w-3 h-3" />
                        </div>
                      )}
                      {fiche.estPublique && (
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg" title="Publique">
                           <Globe className="w-3 h-3" />
                        </div>
                      )}
                   </div>
                   <Button 
                      variant="ghost" 
                      size="icon" aria-label={`Supprimer la fiche ${fiche.titre}`} 
                      onClick={(e) => { e.stopPropagation(); supprimerFiche(fiche.id); }}
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
                      <span key={`cc-${i}`} className="text-[9px] font-bold px-2 py-0.5 bg-gray-50 dark:bg-gray-900 text-gray-500 rounded-full border border-gray-100 dark:border-gray-700">
                        {enTexte(c)}
                      </span>
                    ))}
                    {fiche.contenu.conceptsCles.length > 2 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 text-gray-300">+{fiche.contenu.conceptsCles.length - 2}</span>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-2 border-t border-gray-50 dark:border-gray-700 mt-2 flex justify-between items-center group-hover:bg-gray-50/50 dark:group-hover:bg-gray-900/30 transition-colors">
                <div className="flex gap-1">
                   <Button variant="ghost" size="icon" aria-label={`Télécharger la fiche ${fiche.titre}`} onClick={() => telechargerHTML(fiche)} className="w-8 h-8 rounded-lg text-gray-500 hover:text-primary-600">
                      <Download className="w-4 h-4" />
                   </Button>
                   <Button variant="ghost" size="icon" aria-label={`Imprimer la fiche ${fiche.titre}`} onClick={() => imprimerFiche(fiche)} className="w-8 h-8 rounded-lg text-gray-500 hover:text-primary-600">
                      <Printer className="w-4 h-4" />
                   </Button>
                </div>
                <Button 
                   onClick={() => ouvrirDetail(fiche)} 
                   variant="ghost" 
                   className="text-xs font-black uppercase tracking-widest text-primary-600 hover:bg-transparent hover:translate-x-1 transition-all"
                >
                   Ouvrir <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
