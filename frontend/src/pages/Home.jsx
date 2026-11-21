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

const StatCard = ({ icon: Icon, titre, valeur, couleur, lien }) => (
  <Link to={lien} className="block group">
    <Card className="hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${couleur} transition-transform group-hover:scale-110`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{valeur}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{titre}</p>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const ActionRapide = ({ icon: Icon, titre, description, href, couleur }) => (
  <Link to={href} className="block group">
    <Card className="h-full hover:shadow-md transition-all duration-300 group-hover:border-primary-200 group-hover:-translate-y-1">
      <CardHeader className="p-6 pb-2">
        <div className={`w-10 h-10 rounded-xl ${couleur} flex items-center justify-center mb-1 group-hover:rotate-6 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <CardTitle className="text-base group-hover:text-primary-600 transition-colors">
          {titre}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        <span className="text-xs font-semibold text-primary-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-600 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-primary-200 dark:shadow-none">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Bonjour, {utilisateur?.nom?.split(" ")[0]} <Sparkles className="inline-block w-8 h-8 text-yellow-300 ml-1" />
            </h2>
            <p className="mt-3 text-lg opacity-90 font-medium">
              Prêt à booster tes connaissances aujourd'hui ? Tu es sur une incroyable série de{" "}
              <span className="bg-white/20 px-2 py-0.5 rounded-lg backdrop-blur-sm border border-white/10">
                {stats.serie} jours
              </span> !
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/assistant">
                <Button className="bg-white text-primary-700 hover:bg-gray-100 px-6 font-bold shadow-lg shadow-black/10 transition-transform active:scale-95">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Demander à l'IA
                </Button>
              </Link>
              <Link to="/mes-cours">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm px-6 font-bold transition-transform active:scale-95">
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Ajouter un cours
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-inner">
               <BrainCircuit className="w-24 h-24 text-white opacity-80" />
            </div>
          </div>
        </div>
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-secondary-500/20 rounded-full blur-3xl" />
      </div>

      {/* Stats Grid */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Aperçu de tes progrès</h3>
          <Link to="/profil" className="text-sm font-semibold text-primary-600 hover:underline">Voir détails</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={BookOpen} titre="Cours" valeur={stats.cours} couleur="bg-blue-50 text-blue-600 dark:bg-blue-900/30" lien="/mes-cours" />
          <StatCard icon={FileText} titre="Fiches" valeur={stats.fiches} couleur="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" lien="/fiches" />
          <StatCard icon={BrainCircuit} titre="Quiz" valeur={stats.quiz} couleur="bg-purple-50 text-purple-600 dark:bg-purple-900/30" lien="/quiz" />
          <StatCard icon={Target} titre="Score moyen" valeur={`${stats.scoreMoyen}%`} couleur="bg-orange-50 text-orange-600 dark:bg-orange-900/30" lien="/quiz" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Planning Section */}
        <section className="lg:col-span-1">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
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
                    <Link to="/planning">
                      <Button size="icon" variant="ghost" className="rounded-full group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
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
          <Card className="mt-6 bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-none">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">Série actuelle</p>
                <p className="text-lg font-black text-orange-900 dark:text-orange-200">{stats.serie} jours consécutifs !</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Actions Grid */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Raccourcis rapides</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ActionRapide
              icon={PlusCircle} titre="Ajouter un cours"
              description="Importe un PDF ou colle ton texte pour commencer"
              href="/mes-cours" couleur="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
            />
            <ActionRapide
              icon={Sparkles} titre="Générer une fiche IA"
              description="Transforme n'importe quel cours en une fiche structurée"
              href="/fiches" couleur="bg-purple-50 text-purple-600 dark:bg-purple-900/20"
            />
            <ActionRapide
              icon={PlayCircle} titre="Lancer un quiz"
              description="Teste tes connaissances sur tes derniers cours"
              href="/quiz" couleur="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
            />
            <ActionRapide
              icon={MessageSquare} titre="Assistant IA"
              description="Ton tuteur personnel disponible 24/7"
              href="/assistant" couleur="bg-orange-50 text-orange-600 dark:bg-orange-900/20"
            />
            <ActionRapide
              icon={Calendar} titre="Mon planning"
              description="Organisation intelligente de tes révisions"
              href="/planning" couleur="bg-pink-50 text-pink-600 dark:bg-pink-900/20"
            />
            <ActionRapide
              icon={BrainCircuit} titre="Révision Flash"
              description="Entraîne ta mémoire avec les flashcards"
              href="/fiches" couleur="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
