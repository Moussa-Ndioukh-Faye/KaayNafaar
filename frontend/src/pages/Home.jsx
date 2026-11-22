import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  FileText, 
  BrainCircuit, 
  Target, 
  Calendar, 
  PlusCircle, 
  Sparkles,
  PlayCircle, 
  MessageSquare, 
  Clock, 
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { progressionAPI, coursAPI, fichesAPI, quizAPI } from "../services/api";
import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Eclats, FlecheCourbe, Pointilles, Pastille } from "../components/marque/Gribouillis";

// Carte statistique éditoriale : grand chiffre en Fraunces, filet de couleur en tête
const StatCard = ({ icon: Icon, titre, valeur, couleur, lien }) => (
  <Link to={lien} className="block group rounded-3xl">
    <Card className="relative overflow-hidden h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${couleur}`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600 dark:text-gray-300">{titre}</p>
          <Icon className="w-5 h-5 text-gray-500 group-hover:text-primary-600 transition-colors" aria-hidden="true" />
        </div>
        <p className="font-display text-5xl font-bold tabular-nums text-gray-900 dark:text-white mt-4 leading-none">
          {valeur ?? 0}
        </p>
      </CardContent>
    </Card>
  </Link>
);

const ActionRapide = ({ icon: Icon, titre, description, href, couleur }) => (
  <Link to={href} className="block group">
    <Card className="h-full hover:shadow-md transition-all duration-300 group-hover:border-primary-200 group-hover:-translate-y-1">
      <CardHeader className="p-6 pb-2">
        <div className={`w-11 h-11 rounded-2xl ${couleur} flex items-center justify-center mb-2 group-hover:-rotate-6 transition-transform`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <CardTitle className="font-display text-lg font-semibold text-marine dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
          {titre}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        <span className="text-xs font-bold text-primary-700 dark:text-primary-300 flex items-center gap-1 opacity-60 group-hover:opacity-100 group-hover:gap-2 transition-all">
          Commencer <ArrowRight className="w-3 h-3" />
        </span>
      </CardContent>
    </Card>
  </Link>
);

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
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-10 apparition">
      {/* En-tête d'accueil, dans l'esprit des plateformes e-learning : clair, aéré, trait dessiné */}
      <section className="fond-teinte relative overflow-hidden rounded-[2rem] border border-border p-8 md:p-12">
        <Pointilles className="absolute bottom-6 right-8 opacity-70 hidden md:block" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 border border-border px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-400" aria-hidden="true" />
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h2 className="mt-5 text-4xl md:text-[3.4rem] font-bold leading-[1.1] text-marine dark:text-white">
              Nanga def,{" "}
              <span className="trait-main">{utilisateur?.nom?.split(" ")[0]}</span> !
              <br className="hidden md:block" /> On révise quoi aujourd'hui ?
            </h2>
            <p className="mt-5 text-lg text-gray-600 dark:text-gray-300 max-w-xl">
              Transforme tes cours en fiches et en quiz, puis révise à ton rythme avec l'IA.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/assistant" className="rounded-xl">
                <Button className="h-12 rounded-xl bg-marine hover:bg-marine-clair text-white px-6 font-semibold shadow-lg shadow-marine/20 transition-transform active:scale-95 dark:bg-primary-500 dark:hover:bg-primary-400">
                  <MessageSquare className="w-5 h-5 mr-2" aria-hidden="true" />
                  Demander à l'IA
                </Button>
              </Link>
              <Link to="/mes-cours" className="rounded-xl">
                <Button variant="outline" className="h-12 rounded-xl bg-white dark:bg-transparent border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/40 px-6 font-semibold transition-transform active:scale-95">
                  <PlusCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                  Ajouter un cours
                </Button>
              </Link>
            </div>
          </div>

          {/* Série de révision en pastille, avec flèche dessinée */}
          <div className="relative flex items-center justify-center lg:justify-start gap-6 lg:pr-4">
            <FlecheCourbe className="hidden lg:block w-24 rotate-6" />
            <div className="relative">
              <Pastille
                valeur={stats.serie}
                libelle={stats.serie > 1 ? "jours de suite" : "jour de série"}
                icone={TrendingUp}
                className="w-36 h-36"
              />
              <Eclats className="absolute -top-6 -right-6 w-12 h-12" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-2xl font-bold text-marine dark:text-white"><span className="trait-main">Aperçu de tes progrès</span></h3>
          <Link to="/profil" className="text-sm font-bold text-primary-700 dark:text-primary-300 hover:underline">Voir détails</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={BookOpen} titre="Cours" valeur={stats.cours} couleur="bg-primary-600" lien="/mes-cours" />
          <StatCard icon={FileText} titre="Fiches" valeur={stats.fiches} couleur="bg-secondary-400" lien="/fiches" />
          <StatCard icon={BrainCircuit} titre="Quiz" valeur={stats.quiz} couleur="bg-marine dark:bg-primary-200" lien="/quiz" />
          <StatCard icon={Target} titre="Score moyen" valeur={`${stats.scoreMoyen}%`} couleur="bg-primary-300" lien="/quiz" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Planning Section */}
        <section className="lg:col-span-1">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-2xl font-bold text-marine dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" aria-hidden="true" />
              À faire aujourd'hui
            </h3>
            <Link to="/planning" className="text-sm font-semibold text-gray-500 hover:text-primary-600 transition-colors">Tout voir</Link>
          </div>
          
          <div className="space-y-3">
            {planningDuJour.length > 0 ? (
              planningDuJour.map((session) => (
                <Card key={session.id} className="group hover:border-primary-200 transition-colors overflow-hidden border-l-4 border-l-primary-500">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{session.matiere}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                          <Clock className="w-3 h-3" />
                          {session.dureeMinutes} min
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400">
                          Révision
                        </span>
                      </div>
                    </div>
                    <Link to="/planning" aria-label="Voir le planning de révision">
                      <Button size="icon" tabIndex={-1} aria-hidden="true" variant="ghost" className="rounded-full group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed bg-gray-50/50 dark:bg-gray-800/30">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Rien de prévu pour le moment.</p>
                  <Link to="/planning" className="mt-3 inline-block text-xs font-bold text-primary-600 hover:underline">Planifier ma journée</Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Mini Streak Widget */}
          <Card className="mt-6 bg-secondary-50 border-secondary-100 dark:bg-secondary-900/20 dark:border-secondary-900/30">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-secondary-500 text-white rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-secondary-700 dark:text-secondary-300 uppercase tracking-wider">Série actuelle</p>
                <p className="font-display text-xl font-semibold text-secondary-900 dark:text-secondary-100">{stats.serie} jours consécutifs !</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Actions Grid */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-2xl font-bold text-marine dark:text-white"><span className="trait-main">Raccourcis</span></h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ActionRapide
              icon={PlusCircle} titre="Ajouter un cours"
              description="Importe un PDF ou colle ton texte pour commencer"
              href="/mes-cours" couleur="bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
            />
            <ActionRapide
              icon={Sparkles} titre="Générer une fiche IA"
              description="Transforme n'importe quel cours en une fiche structurée"
              href="/fiches" couleur="bg-secondary-50 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-200"
            />
            <ActionRapide
              icon={PlayCircle} titre="Lancer un quiz"
              description="Teste tes connaissances sur tes derniers cours"
              href="/quiz" couleur="bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
            />
            <ActionRapide
              icon={MessageSquare} titre="Assistant IA"
              description="Ton tuteur personnel disponible 24/7"
              href="/assistant" couleur="bg-secondary-50 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-200"
            />
            <ActionRapide
              icon={Calendar} titre="Mon planning"
              description="Organisation intelligente de tes révisions"
              href="/planning" couleur="bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
            />
            <ActionRapide
              icon={BrainCircuit} titre="Révision Flash"
              description="Entraîne ta mémoire avec les flashcards"
              href="/fiches" couleur="bg-secondary-50 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-200"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
