import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Sparkles, Layers, LogIn, Compass } from "lucide-react";
import { useAuth } from "../App";
import { LogoComplet } from "../components/marque/Logo";
import { Eclats, Pointilles } from "../components/marque/Gribouillis";

/**
 * Page 404 — « Question surprise » : l'étudiant choisit sa réponse
 * (chaque réponse est un lien vers une vraie page de l'application).
 */
const REPONSES_CONNECTE = [
  { lettre: "A", libelle: "Retourner à mes cours", vers: "/mes-cours", icone: BookOpen },
  { lettre: "B", libelle: "Réviser mes fiches", vers: "/fiches", icone: Layers },
  { lettre: "C", libelle: "Demander à l'assistant IA", vers: "/assistant", icone: Sparkles },
];

const REPONSES_VISITEUR = [
  { lettre: "A", libelle: "Découvrir Kaay Nafaar", vers: "/presentation", icone: Compass },
  { lettre: "B", libelle: "Me connecter", vers: "/connexion", icone: LogIn },
  { lettre: "C", libelle: "Créer un compte gratuit", vers: "/inscription", icone: Sparkles },
];

export default function Page404() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { utilisateur } = useAuth();
  const reponses = utilisateur ? REPONSES_CONNECTE : REPONSES_VISITEUR;

  useEffect(() => {
    document.title = "Page introuvable — Kaay Nafaar";
  }, []);

  return (
    <main id="contenu" className="fond-teinte relative min-h-screen overflow-hidden flex flex-col">
      <header className="px-6 sm:px-10 pt-6">
        <Link to="/" aria-label="Kaay Nafaar — accueil" className="inline-block">
          <LogoComplet className="w-32" />
        </Link>
      </header>

      <div className="flex-1 grid place-items-center px-6 py-10">
        <div className="apparition w-full max-w-xl">
          {/* Le grand 404, avec le zéro « corrigé » au crayon */}
          <div className="relative mx-auto w-fit select-none" aria-hidden="true">
            <Eclats className="absolute -left-12 -top-6 rotate-[-18deg]" />
            <Pointilles className="absolute -right-14 bottom-2 opacity-70" />
            <p className="font-display font-bold leading-none tracking-tight text-marine dark:text-white text-[7.5rem] sm:text-[9.5rem]">
              4
              <span className="relative inline-block text-primary-600">
                0
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 m-auto w-[110%] h-[110%] -translate-x-[5%] text-secondary-400"
                  focusable="false"
                >
                  <path
                    d="M18 52 C 30 72, 70 78, 84 46 C 92 26, 64 12, 42 18 C 22 24, 14 40, 22 56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              4
            </p>
          </div>

          {/* Carte « question surprise » */}
          <section
            aria-labelledby="titre-404"
            className="relative mt-6 rounded-[2rem] border border-border bg-card p-7 sm:p-9 shadow-[0_24px_60px_-32px_rgba(10,31,74,0.35)]"
          >
            <span className="absolute -top-3 left-7 rounded-full bg-secondary-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-marine">
              Question surprise
            </span>

            <h1 id="titre-404" className="font-display text-2xl sm:text-3xl font-bold text-marine dark:text-white">
              Cette page n'est <span className="trait-main">pas au programme</span>.
            </h1>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              L'adresse{" "}
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm text-marine dark:text-white break-all">{pathname}</code>{" "}
              n'existe pas ou a été déplacée. Choisis ta réponse :
            </p>

            <ul className="mt-6 space-y-3" aria-label="Où aller maintenant">
              {reponses.map(({ lettre, libelle, vers, icone: Icone }) => (
                <li key={vers}>
                  <Link
                    to={vers}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-background px-4 py-3 min-h-[3.25rem] font-semibold text-marine dark:text-white transition-colors hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-100 font-display text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-900/50 dark:text-primary-200"
                    >
                      {lettre}
                    </span>
                    <span className="flex-1">{libelle}</span>
                    <Icone className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-600" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 underline-offset-4 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Revenir à la page précédente
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
