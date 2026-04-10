/**
 * Page d'accueil — Tableau de bord
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { progressionAPI, coursAPI, fichesAPI, quizAPI } from "../services/api";
import { useAuth } from "../App";

const StatCard = ({ emoji, titre, valeur, couleur, lien }) => (
  <Link
    to={lien}
    className="card hover:shadow-md transition-shadow flex items-center gap-4 group"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${couleur}`}>
      {emoji}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{valeur}</p>
      <p className="text-sm text-gray-500">{titre}</p>
    </div>
  </Link>
);

const ActionRapide = ({ emoji, titre, description, href, couleur }) => (
  <Link
    to={href}
    className="card hover:shadow-md transition-all hover:-translate-y-0.5 group"
  >
    <div className={`w-10 h-10 rounded-xl ${couleur} flex items-center justify-center text-xl mb-3`}>
      {emoji}
    </div>
    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
      {titre}
    </h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
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
    const chargerDonnees = async () => {
      try {
        const [coursRes, fichesRes, quizRes, progRes] = await Promise.allSettled([
          coursAPI.getCours(),
          fichesAPI.getFiches(),
          quizAPI.getQuiz(),
          progressionAPI.getProgression(),
        ]);

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
        // Erreur silencieuse, stats restent à 0
      } finally {
        setChargement(false);
      }
    };

    chargerDonnees();
  }, []);

  if (chargement) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Bienvenue */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-500 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">
          Bonjour, {utilisateur?.nom?.split(" ")[0]} ! 🎓
        </h2>
        <p className="mt-1 opacity-90">
          Prêt à apprendre aujourd'hui ? Tu es sur une série de{" "}
          <strong>{stats.serie} jours</strong> consécutifs !
        </p>
        <div className="mt-4">
          <Link to="/assistant" className="bg-white text-primary-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 inline-block">
            🤖 Demander à l'IA
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Mes statistiques</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard emoji="📚" titre="Cours" valeur={stats.cours} couleur="bg-blue-100" lien="/mes-cours" />
          <StatCard emoji="📋" titre="Fiches" valeur={stats.fiches} couleur="bg-green-100" lien="/fiches" />
          <StatCard emoji="🧠" titre="Quiz" valeur={stats.quiz} couleur="bg-purple-100" lien="/quiz" />
          <StatCard emoji="🎯" titre="Score moyen" valeur={`${stats.scoreMoyen}%`} couleur="bg-orange-100" lien="/quiz" />
        </div>
      </div>

      {/* Planning du jour */}
      {planningDuJour.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📅 À faire aujourd'hui</h3>
          <div className="space-y-2">
            {planningDuJour.map((session) => (
              <div key={session._id} className="card flex items-center gap-4 py-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{session.matiere}</p>
                  <p className="text-sm text-gray-500">{session.dureeMinutes} min</p>
                </div>
                <Link to="/planning" className="text-primary-600 text-sm font-medium hover:underline">
                  Voir →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Actions rapides</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionRapide
            emoji="➕" titre="Ajouter un cours"
            description="Importe un PDF ou colle ton texte"
            href="/mes-cours" couleur="bg-blue-100"
          />
          <ActionRapide
            emoji="✨" titre="Générer une fiche IA"
            description="Transforme un cours en fiche de révision"
            href="/fiches" couleur="bg-purple-100"
          />
          <ActionRapide
            emoji="🎮" titre="Faire un quiz"
            description="Teste tes connaissances avec un quiz IA"
            href="/quiz" couleur="bg-green-100"
          />
          <ActionRapide
            emoji="🤖" titre="Assistant IA"
            description="Pose tes questions, obtiens des explications"
            href="/assistant" couleur="bg-orange-100"
          />
          <ActionRapide
            emoji="📅" titre="Planifier mes révisions"
            description="Génère un planning intelligent"
            href="/planning" couleur="bg-pink-100"
          />
          <ActionRapide
            emoji="🃏" titre="Mes flashcards"
            description="Révise avec la répétition espacée"
            href="/fiches" couleur="bg-yellow-100"
          />
        </div>
      </div>
    </div>
  );
}
