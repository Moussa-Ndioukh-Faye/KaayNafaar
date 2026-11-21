import { useState, useEffect, useRef } from "react";
import { 
  BrainCircuit, 
  Sparkles, 
  Trash2, 
  Play, 
  RotateCcw, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Trophy, 
  Timer, 
  BarChart3,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { quizAPI, coursAPI, iaAPI } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

export default function Quiz() {
  const [quizList, setQuizList] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState("liste");
  const [quizActif, setQuizActif] = useState(null);
  const [session, setSession] = useState({ reponses: [], indexQuestion: 0, debut: null });
  const [resultat, setResultat] = useState(null);
  const [generation, setGeneration] = useState({
    coursId: "", contenu: "", titre: "", nombreQuestions: 5, difficulte: "moyen",
  });
  const [enGeneration, setEnGeneration] = useState(false);
  const [texteStream, setTexteStream] = useState("");
  const [erreur, setErreur] = useState("");
  const controllerRef = useRef();

  useEffect(() => {
    return () => controllerRef.current?.abort?.();
  }, []);

  useEffect(() => {
    const charger = async () => {
      try {
        const [q, c] = await Promise.all([quizAPI.getQuiz(), coursAPI.getCours()]);
        setQuizList(q.data.quizList ?? []);
        setCours(c.data.cours ?? []);
      } catch (_) {
        setErreur("Impossible de charger les quiz.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const handleCoursChange = (e) => {
    const c = cours.find((x) => x.id === e.target.value);
    setGeneration({ ...generation, coursId: e.target.value, contenu: c?.contenu || "", titre: c?.titre ? `Quiz - ${c.titre}` : "" });
  };

  const lancerGeneration = () => {
    if (!generation.contenu.trim()) { setErreur("Contenu requis."); return; }
    setEnGeneration(true); setTexteStream(""); setErreur("");

    controllerRef.current = iaAPI.genererQuizStream(
      { contenuCours: generation.contenu, titreCours: generation.titre, nombreQuestions: generation.nombreQuestions, difficulte: generation.difficulte, coursId: generation.coursId || undefined },
      (delta) => setTexteStream((p) => p + delta),
      () => {
        setEnGeneration(false);
        quizAPI.getQuiz().then(({ data }) => setQuizList(data.quizList)).catch(() => {});
        setVue("liste"); setTexteStream("");
      },
      (err) => { setErreur(err || "Erreur."); setEnGeneration(false); }
    );
  };

  const commencerQuiz = (quiz) => {
    setQuizActif(quiz);
    setSession({ reponses: Array(quiz.questions.length).fill(""), indexQuestion: 0, debut: Date.now() });
    setVue("session");
  };

  const repondre = (reponse) => {
    const nouvellesReponses = [...session.reponses];
    nouvellesReponses[session.indexQuestion] = reponse;
    setSession((prev) => ({
      ...prev,
      reponses: nouvellesReponses,
      indexQuestion: prev.indexQuestion,
    }));
  };

  const questionSuivante = () => {
    if (session.indexQuestion < quizActif.questions.length - 1) {
      setSession((prev) => ({ ...prev, indexQuestion: prev.indexQuestion + 1 }));
    }
  };

  const questionPrecedente = () => {
    if (session.indexQuestion > 0) {
      setSession((prev) => ({ ...prev, indexQuestion: prev.indexQuestion - 1 }));
    }
  };

  const soumettre = async () => {
    const tempsPasse = Math.round((Date.now() - session.debut) / 1000);
    try {
      const { data } = await quizAPI.soumettreSession(quizActif.id, {
        reponses: session.reponses.map((r) => ({ reponseUtilisateur: r })),
        tempsPasse,
      });
      setResultat(data.resultat);
      setVue("resultat");
    } catch (_) {
      setErreur("Erreur lors de la soumission.");
    }
  };

  const supprimerQuiz = async (id) => {
    if (!window.confirm("Supprimer ce quiz ?")) return;
    try {
      await quizAPI.supprimerQuiz(id);
      setQuizList((prev) => prev.filter((q) => q.id !== id));
    } catch (_) {
      setErreur("Impossible de supprimer le quiz.");
    }
  };

  if (vue === "resultat" && resultat) {
    const pct = resultat.pourcentage;
    const stats = [
      { label: "Score", value: `${resultat.score} / ${resultat.total}`, icon: Trophy, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
      { label: "Réussite", value: `${pct}%`, icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
      { label: "Questions", value: resultat.total, icon: HelpCircle, color: "text-primary-500", bg: "bg-primary-50 dark:bg-primary-900/20" },
    ];

    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-10">
        <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none text-center p-8 bg-white dark:bg-gray-800">
           <div className="flex justify-center mb-6">
              <div className={cn(
                "w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-lg",
                pct >= 80 ? "bg-emerald-500 text-white" : pct >= 50 ? "bg-orange-500 text-white" : "bg-red-500 text-white"
              )}>
                 <Trophy className="w-12 h-12" />
              </div>
           </div>
           <h2 className="text-3xl font-black text-gray-900 dark:text-white">Félicitations !</h2>
           <p className="text-gray-500 mt-2">Tu as terminé le quiz avec brio.</p>
           
           <div className="grid grid-cols-3 gap-4 mt-8">
               {stats.map((s) => (
                 <div key={s.label} className={cn("p-4 rounded-3xl border-2 border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all", s.bg)}>
                   <s.icon className={cn("w-5 h-5 mx-auto mb-2", s.color)} />
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{s.label}</p>
                   <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
                </div>
              ))}
           </div>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-black text-gray-900 dark:text-white px-2 flex items-center gap-2">
             <CheckCircle2 className="w-5 h-5 text-emerald-500" />
             Correction détaillée
          </h3>
           {quizActif.questions.map((q, i) => {
            const rep = resultat.reponses[i];
            return (
              <Card key={`qcorr-${i}`} className={cn(
                "rounded-3xl border-2 transition-all",
                rep?.estCorrecte 
                  ? "border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-900/10" 
                  : "border-red-100 dark:border-red-900/30 bg-red-50/20 dark:bg-red-900/10"
              )}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                     <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs",
                        rep?.estCorrecte ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                     )}>
                        {i + 1}
                     </div>
                     <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-base">{q.question}</p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                              <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Ta réponse</p>
                              <p className={cn("text-sm font-bold", rep?.estCorrecte ? "text-emerald-600" : "text-red-600")}>
                                 {rep?.reponseUtilisateur || "Pas de réponse"}
                              </p>
                           </div>
                           {!rep?.estCorrecte && (
                             <div className="p-3 bg-emerald-500 text-white rounded-2xl">
                                <p className="text-[9px] font-black uppercase text-emerald-100 mb-1">Bonne réponse</p>
                                <p className="text-sm font-bold">{q.reponseCorrecte}</p>
                             </div>
                           )}
                        </div>
                        {q.explication && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                             <p className="text-xs text-gray-600 dark:text-gray-400 italic flex items-start gap-2">
                                <Sparkles className="w-3 h-3 mt-0.5 text-primary-500 flex-shrink-0" />
                                {q.explication}
                             </p>
                          </div>
                        )}
                     </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-4">
          <Button onClick={() => commencerQuiz(quizActif)} className="flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary-200 dark:shadow-none">
            <RotateCcw className="w-5 h-5 mr-2" />
            Recommencer
          </Button>
          <Button onClick={() => { setVue("liste"); setResultat(null); setQuizActif(null); }} variant="outline" className="flex-1 h-14 rounded-2xl font-black text-lg">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour à la liste
          </Button>
        </div>
      </div>
    );
  }

  if (vue === "session" && quizActif) {
    const question = quizActif.questions[session.indexQuestion];
    const reponseDonnee = session.reponses[session.indexQuestion];
    const toutesRepondues = session.reponses.every((r) => r !== "");
    const progress = ((session.indexQuestion + 1) / quizActif.questions.length) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-10">
        <div className="flex items-center justify-between px-2">
          <Button variant="ghost" onClick={() => { if(window.confirm("Quitter le quiz ?")) {setVue("liste"); setQuizActif(null);} }} className="rounded-xl font-bold">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Quitter
          </Button>
          <div className="flex items-center gap-3">
             <Timer className="w-4 h-4 text-gray-500" />
             <span className="text-sm font-black text-gray-500 uppercase tracking-widest">
               Question {session.indexQuestion + 1} / {quizActif.questions.length}
             </span>
          </div>
        </div>

        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
           <div 
              className="h-full bg-primary-600 transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }} 
           />
        </div>

        <Card className="rounded-[2.5rem] shadow-2xl border-none p-8 md:p-12 bg-white dark:bg-gray-800">
          <CardHeader className="p-0 mb-8">
             <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                   <HelpCircle className="w-7 h-7" />
                </div>
             </div>
             <CardTitle className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                {question.question}
             </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {question.type === "qcm" && question.options?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {question.options.map((opt, i) => (
                  <button key={`opt-${i}`}
                    onClick={() => repondre(opt)}
                    className={cn(
                      "w-full text-left p-6 rounded-3xl border-2 transition-all duration-200 group flex items-center gap-4",
                      reponseDonnee === opt
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-100 dark:shadow-none"
                        : "border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-primary-200 dark:hover:border-primary-900/50"
                    )}
                  >
                    <div className={cn(
                       "w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-colors",
                       reponseDonnee === opt ? "bg-primary-600 text-white" : "bg-white dark:bg-gray-700 text-gray-500 group-hover:text-primary-500"
                    )}>
                       {String.fromCharCode(65 + i)}
                    </div>
                    <span className={cn(
                       "flex-1 font-bold",
                       reponseDonnee === opt ? "text-primary-900 dark:text-primary-100" : "text-gray-600 dark:text-gray-400"
                    )}>
                       {opt}
                    </span>
                    {reponseDonnee === opt && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-[2rem] p-6 text-lg bg-gray-50 dark:bg-gray-900 outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/20 focus:border-primary-500 transition-all h-32 resize-none"
                  placeholder="Écris ta réponse ici…"
                  value={reponseDonnee}
                  onChange={(e) => repondre(e.target.value)}
                  maxLength={500}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
             variant="outline" 
             disabled={session.indexQuestion === 0} 
             onClick={questionPrecedente} 
             className="flex-1 h-14 rounded-2xl font-black text-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Précédente
          </Button>
          {session.indexQuestion < quizActif.questions.length - 1 ? (
            <Button 
               onClick={questionSuivante} 
               disabled={!reponseDonnee} 
               className="flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-primary-200 dark:shadow-none"
            >
              Suivante
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button 
               onClick={soumettre} 
               disabled={!toutesRepondues} 
               className="flex-1 h-14 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Terminer
            </Button>
          )}
        </div>
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
             Générer un quiz IA
          </h2>
        </div>

        {erreur && (
           <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              {erreur}
           </div>
        )}

        <Card className="rounded-[2rem] shadow-xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
             <CardTitle className="text-xl">Paramètres du quiz</CardTitle>
             <CardDescription>L'IA va extraire des questions pertinentes basées sur ton cours.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <label htmlFor="quiz-champ-382" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Choisir un cours</label>
              <select id="quiz-champ-382" 
                 className="w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none" 
                 onChange={handleCoursChange} 
                 value={generation.coursId}
              >
                <option value="">-- Sélectionner un cours --</option>
                {cours.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="quiz-champ-394" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Contenu (Texte libre)</label>
              <textarea id="quiz-champ-394" 
                 className="w-full px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all h-32 resize-none" 
                 placeholder="Ou colle le texte directement ici…"
                 value={generation.contenu} 
                 maxLength={50000}
                 onChange={(e) => setGeneration({ ...generation, contenu: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="quiz-champ-406" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nombre de questions</label>
                <select id="quiz-champ-406" 
                   className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none appearance-none" 
                   value={generation.nombreQuestions}
                   onChange={(e) => setGeneration({ ...generation, nombreQuestions: parseInt(e.target.value) })}
                >
                  {[3, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="quiz-champ-416" className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Difficulté</label>
                <select id="quiz-champ-416" 
                   className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none appearance-none" 
                   value={generation.difficulte}
                   onChange={(e) => setGeneration({ ...generation, difficulte: e.target.value })}
                >
                  <option value="facile">Facile 🌱</option>
                  <option value="moyen">Moyen 🧠</option>
                  <option value="difficile">Difficile 🔥</option>
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0">
             <Button onClick={lancerGeneration} disabled={enGeneration || !generation.contenu.trim()} className="w-full h-14 rounded-2xl font-black text-lg">
               {enGeneration ? (
                 <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    Extraction des questions...
                 </div>
               ) : <><Sparkles className="w-6 h-6 mr-2" /> Créer mon quiz</>}
             </Button>
          </CardFooter>
        </Card>

        {texteStream && (
          <Card className="rounded-3xl bg-gray-900 border-none shadow-2xl overflow-hidden">
             <CardContent className="p-6">
                <pre className="text-[10px] text-emerald-400/80 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
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
            <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-secondary-600" />
            </div>
            Quiz & Évaluations
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{quizList.length} quiz pour tester tes connaissances</p>
        </div>
        <Button onClick={() => setVue("generer")} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary-100 dark:shadow-none transition-transform active:scale-95">
          <Sparkles className="w-5 h-5 mr-2" />
          Nouveau Quiz IA
        </Button>
      </div>

      {erreur && (
         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm animate-fade-in">{erreur}</div>
      )}

      {chargement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-[2rem] animate-pulse" />
           ))}
        </div>
      ) : quizList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <BrainCircuit className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Aucun quiz disponible</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">Génère un quiz à partir de tes cours pour valider tes acquis.</p>
          <Button onClick={() => setVue("generer")} variant="outline" className="mt-6 rounded-xl font-bold">
            Générer mon premier quiz
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizList.map((q) => {
            const derniereSession = q.sessions?.[q.sessions.length - 1];
            const score = derniereSession ? Math.round((derniereSession.score / derniereSession.total) * 100) : null;
            
            return (
              <Card key={q.id} className="group relative rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-primary-200 transition-all duration-300 hover:-translate-y-2 bg-white dark:bg-gray-800">
                <div className={cn(
                   "h-3 w-full",
                   score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-orange-500" : score !== null ? "bg-red-500" : "bg-gray-200 dark:bg-gray-700"
                )} />
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500 group-hover:text-primary-600 transition-colors">
                          <HelpCircle className="w-6 h-6" />
                        </div>
                        {q.genereeParIA && (
                          <div className="p-1.5 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-lg">
                             <Sparkles className="w-4 h-4" />
                          </div>
                        )}
                     </div>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); supprimerQuiz(q.id); }}
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
                  <CardTitle className="mt-4 text-xl font-black leading-tight truncate group-hover:text-primary-600 transition-colors">
                     {q.titre}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-3">
                     <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-secondary-50 dark:bg-secondary-900/50 text-secondary-700 dark:text-secondary-300 rounded-md">
                        {q.difficulte}
                     </span>
                     <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 rounded-md">
                        <Timer className="w-3 h-3" /> {q.dureeMinutes} min
                     </span>
                     <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md">
                        {q.questions?.length} questions
                     </span>
                  </div>
                </CardHeader>

                <CardContent className="pb-6">
                   {score !== null ? (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                         <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-black text-xs",
                            score >= 80 ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                         )}>
                            {score}%
                         </div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Dernier essai</p>
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                               {derniereSession.score} / {derniereSession.total} bonnes réponses
                            </p>
                         </div>
                         <BarChart3 className="w-5 h-5 text-gray-300" />
                      </div>
                   ) : (
                      <div className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                         <Play className="w-5 h-5 text-gray-200" />
                         <p className="text-sm font-bold text-gray-300">Pas encore tenté</p>
                      </div>
                   )}
                </CardContent>

                <CardFooter className="pt-0">
                   <Button onClick={() => commencerQuiz(q)} className="w-full h-12 rounded-2xl font-black transition-transform active:scale-95 group-hover:shadow-lg group-hover:shadow-primary-100 dark:group-hover:shadow-none">
                      {derniereSession ? <RotateCcw className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {derniereSession ? "Refaire le quiz" : "Commencer le quiz"}
                   </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
