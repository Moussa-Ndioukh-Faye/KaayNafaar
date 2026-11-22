import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FileText, BrainCircuit, Calendar, PlusCircle, MessageSquare, Clock, ArrowRight, Layers } from "lucide-react";
import { progressionAPI, coursAPI, fichesAPI, quizAPI } from "../services/api";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

/** Score en pourcentage → note sur 20, comme sur un bulletin (ex. 78 % → 15,6) */
const surVingt = (pct) => (Math.round((Number(pct) || 0) * 2) / 10).toLocaleString("fr-FR");

/** Le « tampon » du professeur : la série de jours, entourée à l'encre rouge */
function TamponSerie({ serie }) {
  return (
    <div
      className="relative w-28 h-28 md:w-40 md:h-40 shrink-0 -rotate-6 select-none"
      role="img"
      aria-label={serie > 0 ? `${serie} jour${serie > 1 ? "s" : ""} de révision d'affilée` : "Aucune série en cours"}
    >
      <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full text-marge" aria-hidden="true">
        <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="80" cy="80" r="62" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 4" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-marge" aria-hidden="true">
        <span className="font-display text-4xl md:text-6xl font-semibold leading-none chiffres">{serie}</span>
        <span className="mt-1 w-[70%] text-center leading-tight text-[0.62rem] md:text-[0.72rem] font-semibold uppercase tracking-[0.1em]">
          {serie > 1 ? "jours de suite" : serie === 1 ? "jour de suite" : "à démarrer"}
        </span>
      </div>
    </div>
  );
}

/** Une colonne du bulletin (cours, fiches, quiz, moyenne) */
function CaseBulletin({ libelle, valeur, detail, vers, icone: Icone }) {
  return (
    <Link
      to={vers}
      className="group relative flex flex-col justify-between p-5 min-h-[8.5rem] hover:bg-secondary/25 focus-visible:bg-secondary/25 transition-colors"
    >
      <span className="etiquette flex items-center gap-2">
        <Icone className="w-4 h-4" aria-hidden="true" />
        {libelle}
      </span>
      <span className="font-display text-5xl font-semibold leading-none text-foreground chiffres">{valeur}</span>
      {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
      <ArrowRight
        className="absolute top-5 right-5 w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
        aria-hidden="true"
      />
    </Link>
  );
}

const RACCOURCIS = [
  { titre: "Ajouter un cours", detail: "PDF, photo de cahier ou texte", vers: "/mes-cours", icone: PlusCircle },
  { titre: "Générer une fiche", detail: "Résumé, notions clés, flashcards", vers: "/fiches", icone: FileText },
  { titre: "Lancer un quiz", detail: "Vérifie ce que tu as retenu", vers: "/quiz", icone: BrainCircuit },
  { titre: "Réviser les flashcards", detail: "Les cartes dues aujourd'hui d'abord", vers: "/fiches", icone: Layers },
  { titre: "Poser une question", detail: "L'assistant s'appuie sur tes cours", vers: "/assistant", icone: MessageSquare },
];

export default function Home() {
  const { utilisateur } = useAuth();
  const [stats, setStats] = useState({
    cours: 0, fiches: 0, quiz: 0, scoreMoyen: 0, serie: 0,
  });
  const [chargement, setChargement] = useState(true);
  const [planningDuJour, setPlanningDuJour] = useState([]);

  useEffect(() => {
    let ignore = false;

    const chargerDonnees = async () => {
      try {
        const [coursRes, fichesRes, quizRes, progRes] = await Promise.allSettled([
          coursAPI.getCours(),
          fichesAPI.getFiches(),
          quizAPI.getQuiz(),
          progressionAPI.getProgression(),
        ]);

        if (ignore) return;

        setStats({
          cours: coursRes.status === "fulfilled" ? coursRes.value.data.count : 0,
          fiches: fichesRes.status === "fulfilled" ? fichesRes.value.data.count : 0,
          quiz: quizRes.status === "fulfilled" ? quizRes.value.data.count : 0,
          scoreMoyen: progRes.status === "fulfilled"
            ? progRes.value.data.progression?.stats?.scoreMoyenQuiz || 0
            : 0,
          serie: progRes.status === "fulfilled"
            ? progRes.value.data.progression?.stats?.serie || 0
            : 0,
        });

        if (progRes.status === "fulfilled") {
          const today = new Date().toDateString();
          const planning = progRes.value.data.progression?.planning || [];
          setPlanningDuJour(
            planning
              .filter((s) => new Date(s.date).toDateString() === today && !s.estComplete)
              .slice(0, 3)
          );
        }
      } catch (_) {
      } finally {
        if (!ignore) setChargement(false);
      }
    };

    chargerDonnees();
    return () => {
      ignore = true;
    };
  }, []);

  if (chargement) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
        <span className="sr-only">Chargement du tableau de bord…</span>
      </div>
    );
  }

  const prenom = utilisateur?.nom?.split(" ")[0] || "";

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-12 apparition">
      {/* En-tête de page de cahier : salutation en wolof, tampon de série */}
      <section className="flex flex-col-reverse gap-8 md:flex-row md:items-center md:justify-between pt-2">
        <div className="max-w-2xl">
          <h1 className="text-[2.6rem] md:text-[3.6rem] leading-[1.02] text-foreground">
            Nanga def, <span className="surligne">{prenom}</span>.
            <span className="block font-normal italic text-foreground/80 mt-1">On révise quoi aujourd'hui ?</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">
            Importe un cours, transforme-le en fiche et en quiz, puis révise au bon moment.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/mes-cours">
                <PlusCircle aria-hidden="true" />
                Ajouter un cours
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/assistant">
                <MessageSquare aria-hidden="true" />
                Demander à l'assistant
              </Link>
            </Button>
          </div>
        </div>
        <div className="self-end md:self-center md:mr-6">
          <TamponSerie serie={stats.serie} />
          {stats.serie === 0 && (
            <p className="annotation text-sm mt-2 max-w-[11rem] rotate-[-3deg]">Une révision aujourd'hui et la série commence.</p>
          )}
        </div>
      </section>

      {/* Bulletin : une seule fiche découpée en colonnes, comme un relevé de notes */}
      <section aria-labelledby="titre-bulletin">
        <div className="flex items-baseline justify-between mb-3">
          <h2 id="titre-bulletin" className="text-2xl">Mon bulletin</h2>
          <Link to="/analytiques" className="text-sm font-semibold text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary">
            Voir ma progression
          </Link>
        </div>
        <div className="bg-card border border-border rounded-lg shadow-md grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border overflow-hidden">
          <CaseBulletin libelle="Cours" valeur={stats.cours} vers="/mes-cours" icone={BookOpen} />
          <CaseBulletin libelle="Fiches" valeur={stats.fiches} vers="/fiches" icone={FileText} />
          <CaseBulletin libelle="Quiz" valeur={stats.quiz} vers="/quiz" icone={BrainCircuit} />
          <CaseBulletin
            libelle="Moyenne"
            valeur={
              <>
                {surVingt(stats.scoreMoyen)}
                <span className="text-2xl text-muted-foreground"> /20</span>
              </>
            }
            detail={`${stats.scoreMoyen} % de bonnes réponses`}
            vers="/quiz"
            icone={Clock}
          />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        {/* Programme du jour : une liste à cocher */}
        <section aria-labelledby="titre-programme">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="titre-programme" className="text-2xl">Au programme aujourd'hui</h2>
            <Link to="/planning" className="text-sm font-semibold text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary">
              Planning
            </Link>
          </div>
          {planningDuJour.length > 0 ? (
            <ul className="bg-card border border-border rounded-lg shadow-md divide-y divide-border">
              {planningDuJour.map((session) => (
                <li key={session.id || session._id}>
                  <Link to="/planning" className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors">
                    <span aria-hidden="true" className="w-5 h-5 rounded-[3px] border-[1.5px] border-encre/70 dark:border-foreground/60 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-foreground truncate">{session.sujet || session.matiere}</span>
                      <span className="text-sm text-muted-foreground">{session.dureeMinutes} min</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-dashed border-input rounded-lg px-6 py-8 text-center bg-card/60">
              <Calendar className="w-6 h-6 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-muted-foreground">Rien de prévu pour aujourd'hui.</p>
              <Link to="/planning" className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-4">
                Préparer mon planning
              </Link>
            </div>
          )}
        </section>

        {/* Raccourcis : une table des matières, pas une grille de cartes */}
        <section aria-labelledby="titre-raccourcis">
          <h2 id="titre-raccourcis" className="text-2xl mb-3">Raccourcis</h2>
          <ul className="border-t border-encre/80 dark:border-foreground/40">
            {RACCOURCIS.map(({ titre, detail, vers, icone: Icone }) => (
              <li key={titre} className="border-b border-border">
                <Link to={vers} className="group flex items-center gap-4 py-3.5 px-1 hover:bg-secondary/20 transition-colors">
                  <Icone className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="font-display text-lg font-semibold text-foreground">{titre}</span>
                    <span className="block text-sm text-muted-foreground">{detail}</span>
                  </span>
                  <ArrowRight className={cn("w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary")} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
