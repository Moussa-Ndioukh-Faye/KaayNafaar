import { useState, useEffect, useRef } from "react";
import { BrainCircuit, PenLine } from "lucide-react";
import { quizAPI, coursAPI, iaAPI } from "../services/api";
import { Button } from "../components/ui/button";
import ResultatQuiz from "../components/quiz/ResultatQuiz";
import SessionQuiz from "../components/quiz/SessionQuiz";
import GenerationQuiz from "../components/quiz/GenerationQuiz";
import CarteQuiz from "../components/quiz/CarteQuiz";

export default function Quiz() {
  const [quizList, setQuizList] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState("liste");
  const [quizActif, setQuizActif] = useState(null);
  const [session, setSession] = useState({ reponses: [], indexQuestion: 0, debut: null });
  const [resultat, setResultat] = useState(null);
  const [generation, setGeneration] = useState({
    coursId: "",
    contenu: "",
    titre: "",
    nombreQuestions: 5,
    difficulte: "moyen",
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
    // La valeur d'un <select> est toujours une chaîne : on compare des chaînes
    const c = cours.find((x) => String(x.id) === e.target.value);
    setGeneration({
      ...generation,
      coursId: e.target.value,
      contenu: c?.contenu || "",
      titre: c?.titre ? `Quiz - ${c.titre}` : "",
    });
  };

  const lancerGeneration = () => {
    if (!generation.contenu.trim()) {
      setErreur("Contenu requis.");
      return;
    }
    setEnGeneration(true);
    setTexteStream("");
    setErreur("");

    controllerRef.current = iaAPI.genererQuizStream(
      {
        contenuCours: generation.contenu,
        titreCours: generation.titre,
        nombreQuestions: generation.nombreQuestions,
        difficulte: generation.difficulte,
        coursId: generation.coursId || undefined,
      },
      (delta) => setTexteStream((p) => p + delta),
      () => {
        setEnGeneration(false);
        quizAPI
          .getQuiz()
          .then(({ data }) => setQuizList(data.quizList))
          .catch(() => {});
        setVue("liste");
        setTexteStream("");
      },
      (err) => {
        setErreur(err || "Erreur.");
        setEnGeneration(false);
      }
    );
  };

  const commencerQuiz = (quiz) => {
    setQuizActif(quiz);
    setSession({
      reponses: Array(quiz.questions.length).fill(""),
      indexQuestion: 0,
      debut: Date.now(),
    });
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
    return (
      <ResultatQuiz
        quiz={quizActif}
        resultat={resultat}
        onRecommencer={() => commencerQuiz(quizActif)}
        onRetour={() => {
          setVue("liste");
          setResultat(null);
          setQuizActif(null);
        }}
      />
    );
  }

  if (vue === "session" && quizActif) {
    return (
      <SessionQuiz
        quiz={quizActif}
        session={session}
        onRepondre={repondre}
        onPrecedente={questionPrecedente}
        onSuivante={questionSuivante}
        onTerminer={soumettre}
        onQuitter={() => {
          if (window.confirm("Quitter le quiz ?")) {
            setVue("liste");
            setQuizActif(null);
          }
        }}
      />
    );
  }

  if (vue === "generer") {
    return (
      <GenerationQuiz
        cours={cours}
        generation={generation}
        setGeneration={setGeneration}
        onCoursChange={handleCoursChange}
        onLancer={lancerGeneration}
        onRetour={() => {
          setVue("liste");
          setTexteStream("");
          setEnGeneration(false);
          controllerRef.current?.abort?.();
        }}
        enGeneration={enGeneration}
        texteStream={texteStream}
        erreur={erreur}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl text-foreground">Mes quiz</h2>
          <p className="annotation text-base mt-1">
            {quizList.length} quiz pour tester tes connaissances
          </p>
        </div>
        <Button
          onClick={() => setVue("generer")}
          className="rounded-xl h-11 px-6 font-bold shadow-lg transition-transform active:scale-95"
        >
          <PenLine aria-hidden="true" />
          Nouveau quiz
        </Button>
      </div>

      {erreur && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm animate-fade-in">
          {erreur}
        </div>
      )}

      {chargement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : quizList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <BrainCircuit className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Aucun quiz disponible</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
            Génère un quiz à partir de tes cours pour valider tes acquis.
          </p>
          <Button
            onClick={() => setVue("generer")}
            variant="outline"
            className="mt-6 rounded-xl font-bold"
          >
            Générer mon premier quiz
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizList.map((q) => (
            <CarteQuiz
              key={q.id}
              quiz={q}
              onCommencer={commencerQuiz}
              onSupprimer={supprimerQuiz}
            />
          ))}
        </div>
      )}
    </div>
  );
}
