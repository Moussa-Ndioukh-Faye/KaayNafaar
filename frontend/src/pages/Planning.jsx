import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  AlertCircle, 
  ChevronRight, 
  Lightbulb,
  X,
  CalendarDays,
  Target,
  ArrowRight
} from "lucide-react";
import { progressionAPI, coursAPI, iaAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

export default function Planning() {
  const [planning, setPlanning] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [afficherGenerateur, setAfficherGenerateur] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    matiere: "",
    coursId: "",
    dureeMinutes: 30,
    notes: "",
  });
  const [genForm, setGenForm] = useState({
    dateDebut: new Date().toISOString().split("T")[0],
    dateFin: "",
    disponibilite: 2,
  });
  const [planningGenere, setPlanningGenere] = useState(null);
  const [enGeneration, setEnGeneration] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const [prog, c] = await Promise.all([progressionAPI.getProgression(), coursAPI.getCours()]);
        setPlanning(prog.data.progression?.planning || []);
        setCours(c.data.cours ?? []);
      } catch (_) {
        setErreur("Impossible de charger le planning.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const ajouterSession = async (e) => {
    e.preventDefault();
    if (!form.matiere.trim() || !form.date) { setErreur("Date et matière requises."); return; }
    setEnvoi(true);
    setErreur("");
    try {
      const { data } = await progressionAPI.ajouterPlanning({
        date: form.date,
        matiere: form.matiere.trim(),
        coursId: form.coursId || undefined,
        dureeMinutes: form.dureeMinutes,
        notes: form.notes.trim(),
      });
      setPlanning(data.planning);
      setAfficherFormulaire(false);
      setSucces("Session planifiée !");
      setTimeout(() => setSucces(""), 3000);
      setForm({ date: new Date().toISOString().split("T")[0], matiere: "", coursId: "", dureeMinutes: 30, notes: "" });
    } catch (_) {
      setErreur("Erreur lors de l'ajout.");
    } finally {
      setEnvoi(false);
    }
  };

  const completerSession = async (id) => {
    try {
      await progressionAPI.completerSession(id, { estComplete: true });
      setPlanning((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estComplete: true } : s))
      );
    } catch (_) {
      setErreur("Erreur lors de la mise à jour.");
    }
  };

  const genererPlanningIA = async (e) => {
    e.preventDefault();
    if (!genForm.dateFin) { setErreur("La date de fin est requise."); return; }
    if (new Date(genForm.dateFin) <= new Date(genForm.dateDebut)) {
      setErreur("La date de fin doit être après la date de début.");
      return;
    }
    setEnGeneration(true);
    setErreur("");
    try {
      const { data } = await iaAPI.genererPlanning({
        cours: cours.slice(0, 10).map((c) => ({ titre: c.titre, matiere: c.matiere, duree: c.dureeEstimee })),
        dateDebut: genForm.dateDebut,
        dateFin: genForm.dateFin,
        disponibilite: genForm.disponibilite,
      });
      setPlanningGenere(data.planning);
    } catch (_) {
      setErreur("Erreur de génération du planning.");
    } finally {
      setEnGeneration(false);
    }
  };

  const sauvegarderPlanningGenere = async () => {
    if (!planningGenere?.planning || planningGenere.planning.length === 0) return;
    setEnvoi(true);
    try {
      const { data } = await progressionAPI.ajouterPlanningBulk({ sessions: planningGenere.planning });
      setPlanning(data.planning);
      setAfficherGenerateur(false);
      setPlanningGenere(null);
      setSucces("Planning IA enregistré !");
      setTimeout(() => setSucces(""), 3000);
    } catch (_) {
      setErreur("Erreur lors de la sauvegarde du planning.");
    } finally {
      setEnvoi(false);
    }
  };

  const planningTrié = [...planning].sort((a, b) => new Date(a.date) - new Date(b.date));
  const parDate = planningTrié.reduce((acc, session) => {
    const date = new Date(session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    acc[date] = acc[date] || [];
    acc[date].push(session);
    return acc;
  }, {});

  const prioriteStyles = { 
    haute: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30", 
    moyenne: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30", 
    faible: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl text-foreground">Mon planning</h2>
          <p className="annotation text-base mt-1">{planning.length} sessions de révision programmées</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setAfficherGenerateur(true)} className="rounded-xl h-11 px-6 font-bold border-2 border-primary-100 dark:border-primary-900/30">
            <Sparkles className="w-5 h-5 mr-2 text-primary-600" />
            Générer avec IA
          </Button>
          <Button onClick={() => setAfficherFormulaire(true)} className="rounded-xl h-11 px-6 font-bold shadow-lg transition-transform active:scale-95">
            <Plus className="w-5 h-5 mr-2" />
            Planifier
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {erreur && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 animate-fade-in" role="alert">
            <AlertCircle className="w-4 h-4" />
            {erreur}
          </div>
        )}
        {succes && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 animate-fade-in" role="alert">
            <CheckCircle2 className="w-4 h-4" />
            {succes}
          </div>
        )}
      </div>

      {/* AI Generator Card */}
      {afficherGenerateur && (
        <Card className="rounded-xl shadow-md border-2 border-primary-100 dark:border-primary-900/30 overflow-hidden animate-slide-up">
          <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 p-8 border-b border-gray-100 dark:border-gray-700">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-secondary-600">
                      <Sparkles className="w-6 h-6" />
                   </div>
                   <div>
                      <CardTitle className="text-xl">Planning Intelligent</CardTitle>
                      <CardDescription>Laisse l'IA organiser tes révisions en fonction de tes cours.</CardDescription>
                   </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Fermer le générateur" onClick={() => { setAfficherGenerateur(false); setPlanningGenere(null); }} className="rounded-full">
                   <X className="w-5 h-5" />
                </Button>
             </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <form onSubmit={genererPlanningIA} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="planning-champ-215" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Date de début</label>
                <input id="planning-champ-215" type="date" className="input-field" 
                  value={genForm.dateDebut}
                  onChange={(e) => setGenForm({ ...genForm, dateDebut: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="planning-champ-221" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Date de fin</label>
                <input id="planning-champ-221" type="date" className="input-field" 
                  value={genForm.dateFin} required
                  min={genForm.dateDebut}
                  onChange={(e) => setGenForm({ ...genForm, dateFin: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label htmlFor="planning-champ-228" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Heures par jour</label>
                <select id="planning-champ-228" className="input-field appearance-none" 
                  value={genForm.disponibilite}
                  onChange={(e) => setGenForm({ ...genForm, disponibilite: parseInt(e.target.value) })}>
                  {[1, 2, 3, 4, 6, 8].map((h) => <option key={h} value={h}>{h}h / jour</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                 <Button type="submit" disabled={enGeneration} className="w-full h-14 rounded-2xl font-bold text-lg">
                   {enGeneration ? (
                     <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        Calcul de l'itinéraire optimal...
                     </div>
                   ) : <><Sparkles className="w-6 h-6 mr-2" /> Générer mon programme</>}
                 </Button>
              </div>
            </form>

            {planningGenere && (
              <div className="space-y-6 pt-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                   <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-primary-600" />
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Suggestions de l'IA :</h4>
                   </div>
                   <Button onClick={sauvegarderPlanningGenere} disabled={envoi} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold">
                      {envoi ? "Enregistrement..." : "Sauvegarder tout le programme"}
                   </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{planningGenere.planning?.map((session, i) => (
  <Card key={`session-${i}`} className="rounded-2xl border-none bg-gray-50 dark:bg-gray-900 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                         <div className="text-center w-12 flex-shrink-0">
                            <p className="text-xs font-bold uppercase text-gray-500">
                               {new Date(session.date).toLocaleDateString("fr-FR", { weekday: "short" })}
                            </p>
                            <p className="text-lg font-bold text-primary-600">
                               {new Date(session.date).getDate()}
                            </p>
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">{session.sujet}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                                  <Clock className="w-3 h-3" /> {session.dureeMinutes}min
                               </span>
                               <span className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded-full border", prioriteStyles[session.priorite] || prioriteStyles.moyenne)}>
                                  {session.priorite}
                               </span>
                            </div>
                         </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {planningGenere.conseils_generaux && (
                  <div className="p-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-900/30">
                    <p className="text-sm font-bold text-primary-800 dark:text-primary-300 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Conseils de préparation :
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      {planningGenere.conseils_generaux.map((c, i) => (
                         <li key={i} className="text-sm text-primary-700 dark:text-primary-400 flex items-start gap-2 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                            {c}
                         </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Form Card */}
      {afficherFormulaire && (
        <Card className="rounded-xl shadow-md border-2 border-primary-100 dark:border-primary-900/30 overflow-hidden animate-slide-up">
           <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 p-8 border-b border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                 <CardTitle className="text-xl">Planifier une session</CardTitle>
                 <Button variant="ghost" size="icon" aria-label="Fermer le formulaire" onClick={() => setAfficherFormulaire(false)} className="rounded-full">
                    <X className="w-5 h-5" />
                 </Button>
              </div>
           </CardHeader>
           <form onSubmit={ajouterSession}>
             <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="planning-champ-323" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Date *</label>
                    <input id="planning-champ-323" type="date" className="input-field" value={form.date} required
                      onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="planning-champ-328" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Matière *</label>
                    <input id="planning-champ-328" className="input-field" 
                      placeholder="ex: Mathématiques" required maxLength={100}
                      value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="planning-champ-334" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Cours associé</label>
                    <select id="planning-champ-334" className="input-field appearance-none" value={form.coursId} onChange={(e) => setForm({ ...form, coursId: e.target.value })}>
                      <option value="">-- Aucun --</option>
                      {cours.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="planning-champ-341" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Durée (minutes)</label>
                    <input id="planning-champ-341" type="number" min="5" max="480" className="input-field"
                      value={form.dureeMinutes} onChange={(e) => setForm({ ...form, dureeMinutes: parseInt(e.target.value) || 30 })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="planning-champ-347" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Notes ou objectifs</label>
                  <input id="planning-champ-347" className="input-field" 
                    placeholder="ex: Réviser les chapitres 1 à 3" maxLength={300}
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
             </CardContent>
             <CardFooter className="p-8 pt-0 flex gap-4">
                <Button type="submit" disabled={envoi} className="flex-1 h-12 rounded-2xl font-bold shadow-lg">
                  {envoi ? "Enregistrement..." : "Planifier la session"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAfficherFormulaire(false)} className="h-12 px-8 rounded-2xl font-bold">
                   Annuler
                </Button>
             </CardFooter>
           </form>
        </Card>
      )}

      {/* Main List Section */}
      {chargement ? (
        <div className="space-y-10">
           {[1, 2].map(i => (
              <div key={i} className="space-y-4">
                 <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                 <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
              </div>
           ))}
        </div>
      ) : Object.keys(parDate).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ton planning est vide</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">Commence par planifier manuellement tes sessions ou laisse l'IA le faire pour toi.</p>
          <div className="mt-8 flex gap-4">
             <Button onClick={() => setAfficherFormulaire(true)} variant="outline" className="rounded-xl font-bold">Planifier manuellement</Button>
             <Button onClick={() => setAfficherGenerateur(true)} className="rounded-xl font-bold bg-primary-600">Essayer le générateur IA</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(parDate).map(([date, sessions]) => (
            <div key={date} className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 pb-2">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-gray-900 border-4 border-primary-500" />
              <h3 className="font-display italic text-xl font-medium text-foreground mb-4 pl-2 first-letter:uppercase">
                {date}
              </h3>
              <div className="space-y-4">
                {sessions.map((s) => (
                  <Card key={s.id}
                    className={cn(
                       "group transition-all rounded-lg hover:shadow-lg hover:border-primary-100 dark:hover:border-primary-900/30 overflow-hidden",
                       s.estComplete ? "opacity-60 bg-gray-50/50 dark:bg-gray-800/30" : "bg-white dark:bg-gray-800"
                    )}
                  >
                    <CardContent className="p-5 flex items-center gap-5">
                       <button
                          type="button"
                          aria-label={s.estComplete ? `${s.matiere} : séance terminée` : `Marquer la séance « ${s.matiere} » comme faite`}
                          onClick={() => !s.estComplete && completerSession(s.id)}
                          className={cn(
                             "w-8 h-8 rounded-xl border-2 flex-shrink-0 transition-all flex items-center justify-center group/check",
                             s.estComplete
                               ? "bg-emerald-500 border-emerald-500 text-white"
                               : "border-gray-200 dark:border-gray-700 hover:border-primary-500 bg-white dark:bg-gray-800"
                          )}
                          disabled={s.estComplete}
                       >
                          {s.estComplete ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 group-hover/check:bg-primary-500 transition-colors" />}
                       </button>
                       
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <p className={cn("text-lg font-bold text-gray-900 dark:text-white truncate", s.estComplete && "line-through text-gray-500")}>
                               {s.matiere}
                             </p>
                             {s.coursId && (
                                <div className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                   <BookOpen className="w-2.5 h-2.5" /> lié
                                </div>
                             )}
                          </div>
                          {s.notes && <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{s.notes}</p>}
                       </div>

                       <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="flex flex-col items-end">
                             <div className="flex items-center gap-1 text-xs font-bold uppercase text-gray-500">
                                <Clock className="w-3 h-3" /> Durée
                             </div>
                             <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{s.dureeMinutes} min</p>
                          </div>
                          <ChevronRight className={cn("w-5 h-5 text-gray-200 transition-all", !s.estComplete && "group-hover:text-primary-500 group-hover:translate-x-1")} />
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          
          {/* Motivation Widget */}
          <Card className="rounded-xl border-none surface-marque p-1">
             <div className="bg-white dark:bg-gray-900 rounded-[2.4rem] p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                   <Target className="w-10 h-10 text-orange-700" />
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Cap sur la réussite !</h3>
                   <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">Chaque session terminée te rapproche de ton objectif. Garde le rythme et n'oublie pas de faire des pauses régulières.</p>
                </div>
                <Button className="rounded-2xl h-14 px-10 font-bold text-lg shadow-md">
                   Continuer <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
}
