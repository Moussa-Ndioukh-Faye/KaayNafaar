import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, FileText, BrainCircuit, Calendar, PlusCircle, MessageSquare, Award, ChevronRight, Layers } from "lucide-react";
import { progressionAPI, coursAPI, fichesAPI, quizAPI } from "../services/api";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

/** Score en pourcentage → note sur 20, comme sur un bulletin (ex. 78 % → 15,6) */
const surVingt = (pct) => (Math.round((Number(pct) || 0) * 2) / 10).toLocaleString("fr-FR");

/** Anneau de série, à la manière des anneaux d'activité : objectif 7 jours */
function AnneauSerie({ serie }) {
  const rayon = 52;
  const tour = 2 * Math.PI * rayon;
  const part = Math.min(serie / 7, 1);
  return (
    <div
      className="flex items-center gap-5 rounded-2xl bg-card p-5 shadow-sm"
      role="img"
      aria-label={serie > 0 ? `${serie} jour${serie > 1 ? "s" : ""} de révision d'affilée, objectif 7` : "Aucune série en cours"}
    >
      <svg viewBox="0 0 128 128" className="w-24 h-24 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={rayon} fill="none" strokeWidth="14" className="stroke-succes/15" />
        <circle
          cx="64" cy="64" r={rayon} fill="none" strokeWidth="14" strokeLinecap="round"
          className="stroke-succes transition-[stroke-dashoffset] duration-700"
          strokeDasharray={tour}
          strokeDashoffset={tour * (1 - part)}
        />
      </svg>
      <div aria-hidden="true">
        <p className="etiquette">Série</p>
        <p className="text-4xl font-bold tracking-tight chiffres leading-none mt-1">
          {serie}
          <span className="text-lg font-semibold text-muted-foreground"> / 7 j</span>
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-[12rem]">
          {serie === 0 ? "Une révision aujourd'hui et la série commence." : serie >= 7 ? "Objectif de la semaine atteint." : "Continue demain pour garder le rythme."}
        </p>
      </div>
    </div>
  );
}

/** Carte de statistique façon app Santé : pastille colorée, grand chiffre, libellé */
function CarteStat({ libelle, valeur, detail, vers, icone: Icone, teinte }) {
  return (
    <Link
      to={vers}
      className="group flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.99] motion-reduce:transform-none"
    >
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span aria-hidden="true" className={cn("grid place-items-center w-7 h-7 rounded-[8px] text-white", teinte)}>
            <Icone className="w-4 h-4" strokeWidth={2.2} />
          </span>
          {libelle}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      </span>
      <span className="text-[2.5rem] font-bold tracking-tight leading-none text-foreground chiffres">{valeur}</span>
      {detail && <span className="text-sm text-muted-foreground -mt-1">{detail}</span>}
    </Link>
  );
}

const RACCOURCIS = [
  { titre: "Ajouter un cours", detail: "PDF, Word, PowerPoint, photo ou page web", vers: "/mes-cours", icone: PlusCircle, teinte: "bg-[#00853f]" },
  { titre: "Générer une fiche", detail: "Résumé, notions clés, flashcards", vers: "/fiches", icone: FileText, teinte: "bg-[#f5c400] text-[#1c1c1e]" },
  { titre: "Lancer un quiz", detail: "Vérifie ce que tu as retenu", vers: "/quiz", icone: BrainCircuit, teinte: "bg-[#cf1820]" },
  { titre: "Réviser les flashcards", detail: "Les cartes dues aujourd'hui d'abord", vers: "/fiches", icone: Layers, teinte: "bg-[#e8590c]" },
  { titre: "Poser une question", detail: "L'assistant s'appuie sur tes cours", vers: "/assistant", icone: MessageSquare, teinte: "bg-[#5b4bdb]" },
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

  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const lien = "text-[0.9375rem] font-medium text-primary hover:underline underline-offset-4";

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-10 apparition">
      {/* Grand titre façon « Aujourd'hui » d'iOS, salutation en wolof */}
      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end pt-1">
        <div className="max-w-2xl">
          <p className="etiquette">{date}</p>
          <h1 className="mt-1 text-[2.25rem] md:text-[3rem] leading-[1.05] text-foreground">
            Nanga def, <span className="surligne">{prenom}</span>
          </h1>
          <p className="mt-2 text-xl text-muted-foreground">On révise quoi aujourd'hui ?</p>
          <div className="mt-6 grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/mes-cours">
                <PlusCircle aria-hidden="true" />
                Ajouter un cours
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/assistant">
                <MessageSquare aria-hidden="true" />
                Demander à l'assistant
              </Link>
            </Button>
          </div>
        </div>
        <AnneauSerie serie={stats.serie} />
      </section>

      <section aria-labelledby="titre-resume">
        <div className="flex items-baseline justify-between mb-3 px-1">
          <h2 id="titre-resume" className="text-[1.375rem]">Résumé</h2>
          <Link to="/analytiques" className={lien}>Voir ma progression</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <CarteStat libelle="Cours" valeur={stats.cours} vers="/mes-cours" icone={BookOpen} teinte="bg-[#00853f]" />
          <CarteStat libelle="Fiches" valeur={stats.fiches} vers="/fiches" icone={FileText} teinte="bg-[#f5c400] text-[#1c1c1e]" />
          <CarteStat libelle="Quiz" valeur={stats.quiz} vers="/quiz" icone={BrainCircuit} teinte="bg-[#cf1820]" />
          <CarteStat
            libelle="Moyenne"
            valeur={
              <>
                {surVingt(stats.scoreMoyen)}
                <span className="text-xl font-semibold text-muted-foreground"> /20</span>
              </>
            }
            detail={`${stats.scoreMoyen} % de bonnes réponses`}
            vers="/quiz"
            icone={Award}
            teinte="bg-[#0047db]"
          />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Programme du jour : liste à cocher façon Rappels */}
        <section aria-labelledby="titre-programme">
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 id="titre-programme" className="text-[1.375rem]">Aujourd'hui</h2>
            <Link to="/planning" className={lien}>Planning</Link>
          </div>
          {planningDuJour.length > 0 ? (
            <ul className="bg-card rounded-2xl shadow-sm overflow-hidden">
              {planningDuJour.map((session, i) => (
                <li key={session.id || session._id}>
                  <Link to="/planning" className="flex items-center gap-3.5 pl-4 hover:bg-foreground/[0.03] active:bg-foreground/[0.06] transition-colors">
                    <span aria-hidden="true" className="w-[22px] h-[22px] rounded-full border-2 border-input shrink-0" />
                    <span className={cn("flex flex-1 min-w-0 items-center gap-3 py-3 pr-4", i < planningDuJour.length - 1 && "border-b border-border")}>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-foreground truncate">{session.sujet || session.matiere}</span>
                        <span className="text-sm text-muted-foreground">{session.dureeMinutes} min</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/70" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl bg-card shadow-sm px-6 py-8 text-center">
              <Calendar className="w-7 h-7 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-muted-foreground">Rien de prévu pour aujourd'hui.</p>
              <Link to="/planning" className={cn(lien, "mt-2 inline-block")}>
                Préparer mon planning
              </Link>
            </div>
          )}
        </section>

        {/* Raccourcis : liste groupée façon Réglages */}
        <section aria-labelledby="titre-raccourcis">
          <h2 id="titre-raccourcis" className="text-[1.375rem] mb-3 px-1">Raccourcis</h2>
          <ul className="bg-card rounded-2xl shadow-sm overflow-hidden">
            {RACCOURCIS.map(({ titre, detail, vers, icone: Icone, teinte }, i) => (
              <li key={titre}>
                <Link to={vers} className="group flex items-center gap-3.5 pl-4 hover:bg-foreground/[0.03] active:bg-foreground/[0.06] transition-colors">
                  <span aria-hidden="true" className={cn("grid place-items-center w-[30px] h-[30px] rounded-[8px] text-white shrink-0", teinte)}>
                    <Icone className="w-[17px] h-[17px]" strokeWidth={2.2} />
                  </span>
                  <span className={cn("flex flex-1 min-w-0 items-center gap-3 py-3 pr-4", i < RACCOURCIS.length - 1 && "border-b border-border")}>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-foreground">{titre}</span>
                      <span className="block text-sm text-muted-foreground">{detail}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/70" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
