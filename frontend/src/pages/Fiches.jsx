import { useState, useEffect, useRef } from "react";
import { FileText, Sparkles, PenLine } from "lucide-react";
import { fichesAPI, coursAPI, iaAPI } from "../services/api";
import { Button } from "../components/ui/button";
import VueFlashcards from "../components/fiches/VueFlashcards";
import DetailFiche from "../components/fiches/DetailFiche";
import GenerationFiche from "../components/fiches/GenerationFiche";
import CarteFiche from "../components/fiches/CarteFiche";

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
    setGeneration({
      coursId,
      contenu: c?.contenu || "",
      titre: c?.titre ? `Fiche - ${c.titre}` : "",
    });
  };

  const lancerGeneration = () => {
    if (!generation.contenu.trim()) {
      setErreur("Veuillez fournir un contenu de cours.");
      return;
    }
    setEnGeneration(true);
    setTexteStream("");
    setErreur("");

    controllerRef.current = iaAPI.genererFicheStream(
      {
        contenuCours: generation.contenu,
        titreCours: generation.titre,
        coursId: generation.coursId || undefined,
      },
      (delta) => setTexteStream((prev) => prev + delta),
      () => {
        setEnGeneration(false);
        fichesAPI
          .getFiches()
          .then(({ data }) => setFiches(data.fiches ?? []))
          .catch(() => {});
        setVue("liste");
        setTexteStream("");
      },
      (err) => {
        setErreur(err || "Erreur de génération.");
        setEnGeneration(false);
      }
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

  const ouvrirDetail = (fiche) => {
    setFicheSelectionnee(fiche);
    setVue("detail");
  };
  const ouvrirFlashcards = (fiche) => {
    setFicheSelectionnee(fiche);
    setVue("flashcards");
  };

  const basculerVisibilite = async (fiche) => {
    try {
      const nouvelleValeur = !fiche.estPublique;
      await fichesAPI.modifierFiche(fiche.id, { estPublique: nouvelleValeur });
      setFicheSelectionnee({ ...fiche, estPublique: nouvelleValeur });
      setFiches((prev) =>
        prev.map((f) => (f.id === fiche.id ? { ...f, estPublique: nouvelleValeur } : f))
      );

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
    return (
      <VueFlashcards
        fiche={ficheSelectionnee}
        onRetour={() => setVue("detail")}
        onFicheMiseAJour={(miseAJour) => {
          setFicheSelectionnee(miseAJour);
          setFiches((prev) => prev.map((f) => (f.id === miseAJour.id ? miseAJour : f)));
        }}
      />
    );
  }

  if (vue === "detail" && ficheSelectionnee) {
    return (
      <DetailFiche
        fiche={ficheSelectionnee}
        onRetour={() => setVue("liste")}
        onPartager={basculerVisibilite}
        onFlashcards={ouvrirFlashcards}
        onSupprimer={supprimerFiche}
      />
    );
  }

  if (vue === "generer") {
    return (
      <GenerationFiche
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
          <h2 className="text-3xl md:text-4xl text-foreground">Mes fiches</h2>
          <p className="annotation text-base mt-1">
            {fiches.length} fiches de révision structurées
          </p>
        </div>
        <Button
          onClick={() => setVue("generer")}
          className="rounded-xl h-11 px-6 font-bold shadow-lg transition-transform active:scale-95"
        >
          <PenLine aria-hidden="true" />
          Nouvelle fiche
        </Button>
      </div>

      {erreur && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm animate-fade-in"
          role="alert"
        >
          {erreur}
        </div>
      )}

      {chargement ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : fiches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Aucune fiche disponible
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mt-2">
            Transforme tes cours en fiches de synthèse intelligentes pour réviser plus efficacement.
          </p>
          <Button
            onClick={() => setVue("generer")}
            variant="outline"
            className="mt-6 rounded-xl font-bold"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Générer ma première fiche
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fiches.map((fiche) => (
            <CarteFiche
              key={fiche.id}
              fiche={fiche}
              onOuvrir={ouvrirDetail}
              onSupprimer={supprimerFiche}
            />
          ))}
        </div>
      )}
    </div>
  );
}
