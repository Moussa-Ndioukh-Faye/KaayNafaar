/**
 * Page Quiz — Génération IA + Session interactive
 */

import React, { useState, useEffect, useRef } from "react";
import { quizAPI, coursAPI, iaAPI } from "../services/api";

export default function Quiz() {
  const [quizList, setQuizList] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState("liste"); // liste | generer | session | resultat
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

  // Cleanup : annuler le stream si le composant est démonté
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
    const c = cours.find((x) => x._id === e.target.value);
    setGeneration({ ...generation, coursId: e.target.value, contenu: c?.contenu || "", titre: c?.titre || "" });
  };

  const lancerGeneration = () => {
    if (!generation.contenu.trim()) { setErreur("Contenu requis."); return; }
    setEnGeneration(true); setTexteStream(""); setErreur("");

    controllerRef.current = iaAPI.genererQuizStream(
      { contenuCours: generation.contenu, titreCours: generation.titre, nombreQuestions: generation.nombreQuestions, difficulte: generation.difficulte, coursId: generation.coursId || undefined },
      (delta) => setTexteStream((p) => p + delta),
      () => {
        setEnGeneration(false);
        quizAPI.getQuiz().then(({ data }) => setQuizList(data.quizList));
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
      const { data } = await quizAPI.soumettreSession(quizActif._id, {
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
      setQuizList((prev) => prev.filter((q) => q._id !== id));
    } catch (_) {
      setErreur("Impossible de supprimer le quiz.");
    }
  };

  // ── Vues ──────────────────────────────────────

  if (vue === "resultat" && resultat) {
    const pct = resultat.pourcentage;
    const couleur = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600";
    const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📚";
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card text-center">
          <p className="text-5xl mb-4">{emoji}</p>
          <h2 className="text-2xl font-bold text-gray-900">Résultats</h2>
          <p className={`text-5xl font-bold mt-4 ${couleur}`}>{pct}%</p>
          <p className="text-gray-600 mt-2">{resultat.score} / {resultat.total} bonnes réponses</p>
        </div>

        <div className="space-y-3">
          {quizActif.questions.map((q, i) => {
            const rep = resultat.reponses[i];
            return (
              <div key={i} className={`card border-l-4 ${rep?.estCorrecte ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"}`}>
                <p className="font-medium text-gray-900 text-sm">{i + 1}. {q.question}</p>
                <p className={`text-sm mt-1 ${rep?.estCorrecte ? "text-green-700" : "text-red-700"}`}>
                  Ta réponse : {rep?.reponseUtilisateur || "(non répondu)"}
                </p>
                {!rep?.estCorrecte && (
                  <p className="text-sm text-green-700 mt-1">✅ Bonne réponse : {q.reponseCorrecte}</p>
                )}
                {q.explication && <p className="text-xs text-gray-600 mt-1 italic">{q.explication}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={() => commencerQuiz(quizActif)} className="btn-primary">🔄 Refaire</button>
          <button onClick={() => { setVue("liste"); setResultat(null); setQuizActif(null); }} className="btn-secondary">← Retour</button>
        </div>
      </div>
    );
  }

  if (vue === "session" && quizActif) {
    const question = quizActif.questions[session.indexQuestion];
    const reponseDonnee = session.reponses[session.indexQuestion];
    const toutesRepondues = session.reponses.every((r) => r !== "");

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => { setVue("liste"); setQuizActif(null); }} className="btn-secondary text-sm">← Quitter</button>
          <span className="text-sm text-gray-500">Question {session.indexQuestion + 1} / {quizActif.questions.length}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${((session.indexQuestion + 1) / quizActif.questions.length) * 100}%` }} />
        </div>

        <div className="card">
          <p className="font-semibold text-gray-900 text-lg mb-4">{question.question}</p>

          {question.type === "qcm" && question.options?.length > 0 ? (
            <div className="space-y-2">
              {question.options.map((opt, i) => (
                <button key={i}
                  onClick={() => repondre(opt)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                    reponseDonnee === opt
                      ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                      : "border-gray-200 hover:border-primary-300 hover:bg-gray-50"
                  }`}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              className="input-field"
              placeholder="Ta réponse…"
              value={reponseDonnee}
              onChange={(e) => repondre(e.target.value)}
              maxLength={500}
            />
          )}
        </div>

        <div className="flex gap-3 justify-between">
          <button disabled={session.indexQuestion === 0} onClick={questionPrecedente} className="btn-secondary disabled:opacity-30">← Précédente</button>
          {session.indexQuestion < quizActif.questions.length - 1 ? (
            <button onClick={questionSuivante} disabled={!reponseDonnee} className="btn-primary disabled:opacity-30">Suivante →</button>
          ) : (
            <button onClick={soumettre} disabled={!toutesRepondues} className="btn-primary disabled:opacity-30">
              ✅ Terminer le quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  if (vue === "generer") {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setVue("liste"); setTexteStream(""); setEnGeneration(false); controllerRef.current?.abort?.(); }} className="btn-secondary text-sm">← Retour</button>
          <h2 className="font-bold text-gray-900">🧠 Générer un quiz avec l'IA</h2>
        </div>

        {erreur && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{erreur}</div>}

        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cours source</label>
            <select className="input-field" onChange={handleCoursChange} value={generation.coursId}>
              <option value="">-- Choisir un cours --</option>
              {cours.map((c) => <option key={c._id} value={c._id}>{c.titre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu *</label>
            <textarea className="input-field h-32 resize-none" placeholder="Ou colle le texte directement…"
              value={generation.contenu} maxLength={50000}
              onChange={(e) => setGeneration({ ...generation, contenu: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de questions</label>
              <select className="input-field" value={generation.nombreQuestions}
                onChange={(e) => setGeneration({ ...generation, nombreQuestions: parseInt(e.target.value) })}>
                {[3, 5, 8, 10, 15].map((n) => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
              <select className="input-field" value={generation.difficulte}
                onChange={(e) => setGeneration({ ...generation, difficulte: e.target.value })}>
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
          </div>

          <button onClick={lancerGeneration} disabled={enGeneration || !generation.contenu.trim()} className="btn-primary">
            {enGeneration ? <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Génération…</span> : "🧠 Générer le quiz"}
          </button>
        </div>

        {texteStream && (
          <div className="card bg-gray-50">
            <p className="text-xs text-primary-600 font-semibold mb-2 flex items-center gap-1"><span className="animate-pulse">●</span> Génération en cours…</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-64 overflow-auto">{texteStream}</pre>
          </div>
        )}
      </div>
    );
  }

  // Vue liste
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🧠 Quiz & Évaluations</h2>
          <p className="text-gray-500 text-sm">{quizList.length} quiz</p>
        </div>
        <button onClick={() => setVue("generer")} className="btn-primary">🧠 Générer avec IA</button>
      </div>

      {erreur && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{erreur}</div>}

      {chargement ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : quizList.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">🧠</p>
          <p className="font-medium">Aucun quiz encore.</p>
          <button onClick={() => setVue("generer")} className="btn-primary mt-4">Générer mon premier quiz</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizList.map((q) => {
            const derniereSession = q.sessions?.[q.sessions.length - 1];
            return (
              <div key={q._id} className="card hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 truncate flex-1">{q.titre}</h3>
                  <button onClick={() => supprimerQuiz(q._id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 ml-2">🗑️</button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-purple-100 text-purple-700">{q.difficulte}</span>
                  <span className="badge bg-blue-100 text-blue-700">⏱️ {q.dureeMinutes} min</span>
                  <span className="badge bg-gray-100 text-gray-600">{q.questions?.length} questions</span>
                  {q.genereeParIA && <span className="badge bg-green-100 text-green-700">✨ IA</span>}
                </div>

                {derniereSession && (
                  <p className="text-sm text-gray-600 mb-3">
                    Dernier score : <span className="font-semibold text-primary-600">
                      {derniereSession.total > 0 ? Math.round((derniereSession.score / derniereSession.total) * 100) : 0}%
                    </span>
                  </p>
                )}

                <button onClick={() => commencerQuiz(q)} className="btn-primary text-sm w-full">
                  {derniereSession ? "🔄 Refaire" : "▶️ Commencer"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
