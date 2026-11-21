import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Calendar,
  Check,
  FileDown,
  FileText,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Lock,
  MessageSquare,
  Sparkles,
  Upload,
  Accessibility,
  Download,
} from "lucide-react";
import { useAuth } from "../App";
import Logo, { LogoComplet } from "../components/marque/Logo";
import { Eclats, FlecheCourbe, Pointilles, Pastille } from "../components/marque/Gribouillis";

/* ── Contenu ─────────────────────────────────────────────────────── */

const FONCTIONNALITES = [
  { icone: FileText, titre: "Fiches de révision IA", texte: "L'essentiel de ton cours en une fiche claire : résumé, notions clés, définitions et points à retenir." },
  { icone: BrainCircuit, titre: "Quiz qui s'adaptent", texte: "Des questions générées à partir de tes propres cours, avec correction détaillée et score." },
  { icone: Layers, titre: "Flashcards espacées", texte: "Répétition espacée (algorithme SM-2) : tu revois chaque carte au bon moment pour ne plus l'oublier." },
  { icone: MessageSquare, titre: "Assistant IA", texte: "Pose tes questions : il répond en s'appuyant d'abord sur tes cours, puis sur le web si besoin, avec les sources." },
  { icone: Calendar, titre: "Planning de révision", texte: "Organise tes séances jusqu'à l'examen et coche ce qui est fait, jour après jour." },
  { icone: BarChart3, titre: "Suivi de progression", texte: "Scores, série de jours, temps d'étude : vois où tu progresses et ce qu'il reste à travailler." },
  { icone: Globe, titre: "Bibliothèque partagée", texte: "Découvre des cours publiés par d'autres étudiants et importe-les en un clic." },
  { icone: FileDown, titre: "Export PDF", texte: "Télécharge tes fiches dans une mise en page propre, prête à imprimer ou à réviser hors ligne." },
];

const ETAPES = [
  { icone: Upload, titre: "Importe ton cours", texte: "Un PDF, une photo de ton cahier (reconnaissance de texte) ou du texte copié-collé." },
  { icone: Sparkles, titre: "L'IA le transforme", texte: "En quelques secondes : fiche structurée, quiz et flashcards tirés de ton contenu." },
  { icone: GraduationCap, titre: "Révise et progresse", texte: "Quiz, flashcards et planning : tu révises au bon rythme et suis tes progrès." },
];

const FORMATS = [
  { icone: FileText, label: "PDF" },
  { icone: ImageIcon, label: "Photo de cahier" },
  { icone: BookOpen, label: "Texte copié-collé" },
  { icone: Globe, label: "Bibliothèque" },
];

const PUBLICS = [
  { titre: "Lycée", texte: "Prépare le bac matière par matière, avec des quiz courts pour t'entraîner chaque jour." },
  { titre: "Licence", texte: "Gère la masse de cours du semestre et arrive aux partiels avec des fiches prêtes." },
  { titre: "Master et doctorat", texte: "Synthétise articles et supports, et interroge l'assistant sur tes propres documents." },
];

const FAQ = [
  { q: "Kaay Nafaar est-il gratuit ?", r: "Oui, la création de compte et les fonctionnalités de révision sont gratuites, sans carte bancaire." },
  { q: "Quels documents puis-je importer ?", r: "Des PDF, des images (JPG, PNG) comme une photo de ton cahier grâce à la reconnaissance de texte, et du texte brut. Jusqu'à 50 Mo par fichier." },
  { q: "Mes cours sont-ils privés ?", r: "Oui. Tes fichiers ne sont accessibles qu'à toi. Tu peux exporter toutes tes données ou supprimer ton compte à tout moment depuis ton profil." },
  { q: "Comment l'IA utilise-t-elle mes cours ?", r: "Des extraits de tes cours sont envoyés à des fournisseurs d'IA uniquement pour générer tes fiches, quiz et réponses. Tout est détaillé dans la politique de confidentialité." },
  { q: "Ça marche sur téléphone ?", r: "Oui, le site est conçu pour mobile et peut être ajouté à l'écran d'accueil comme une application." },
];

/* ── Illustration : aperçu de l'application (pas de photo) ─────── */

function ApercuProduit() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <Pointilles className="absolute -top-8 -left-6" />
      <Eclats className="absolute -top-8 right-10 w-12 h-12" />

      {/* Fiche */}
      <div className="relative rounded-3xl bg-white dark:bg-card border border-border p-6 shadow-[0_30px_60px_-30px_rgba(10,31,74,0.45)] rotate-[-2deg]">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-600">
            <FileText className="w-5 h-5" />
          </span>
          <div>
            <p className="font-display font-bold text-marine dark:text-white">Bases de données — SQL</p>
            <p className="text-xs text-gray-500">Fiche générée · 4 min de lecture</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 w-full" />
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 w-11/12" />
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 w-4/5" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Jointures", "Clés étrangères", "Normalisation"].map((t) => (
            <span key={t} className="rounded-full bg-primary-50 dark:bg-primary-900/40 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-200">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Quiz */}
      <div className="relative -mt-6 ml-10 rounded-3xl bg-marine text-white p-5 shadow-xl rotate-[2deg]">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-200">Quiz · question 3/10</p>
        <p className="mt-2 font-semibold">Quelle forme normale élimine les dépendances transitives ?</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {["1FN", "2FN", "3FN", "BCNF"].map((r) => (
            <span
              key={r}
              className={`rounded-xl px-3 py-2 font-semibold ${r === "3FN" ? "bg-secondary-400 text-marine" : "bg-white/10"}`}
            >
              {r === "3FN" && <Check className="inline w-4 h-4 mr-1 -mt-0.5" />}
              {r}
            </span>
          ))}
        </div>
      </div>

      <Pastille valeur="+IA" libelle="sur tes cours" icone={Sparkles} className="absolute -right-4 -bottom-10 w-28 h-28 sm:-right-10" />
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function Presentation() {
  const { utilisateur } = useAuth();

  useEffect(() => {
    document.title = "Kaay Nafaar — Révise malin avec l'IA";
  }, []);

  const lienPrincipal = utilisateur ? "/" : "/inscription";
  const textePrincipal = utilisateur ? "Mon tableau de bord" : "Commencer gratuitement";

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary-700 focus:text-white focus:font-bold"
      >
        Aller au contenu principal
      </a>

      {/* En-tête */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between gap-4">
          <Link to="/presentation" aria-label="Kaay Nafaar, accueil" className="rounded-xl">
            <Logo />
          </Link>
          <nav aria-label="Sections de la page" className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <a href="#fonctionnalites" className="hover:text-primary-600">Fonctionnalités</a>
            <a href="#comment" className="hover:text-primary-600">Comment ça marche</a>
            <a href="#confiance" className="hover:text-primary-600">Confiance</a>
            <a href="#faq" className="hover:text-primary-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {!utilisateur && (
              <Link to="/connexion" className="hidden sm:inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-marine dark:text-white hover:bg-muted">
                Se connecter
              </Link>
            )}
            <Link
              to={lienPrincipal}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 px-4 text-sm font-semibold text-white shadow-md shadow-primary-600/20"
            >
              {utilisateur ? "Tableau de bord" : "S'inscrire"}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        {/* Héros */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-5 pt-14 pb-24 md:pt-20 grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="apparition">
              <p className="inline-flex items-center gap-2 rounded-full bg-accent border border-border px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-200">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-400" />
                Plateforme de révision avec IA · conçue à Dakar
              </p>
              <h1 className="mt-6 text-[2.6rem] leading-[1.08] sm:text-6xl font-bold text-marine dark:text-white">
                Révise moins longtemps, <span className="trait-main">retiens</span> mieux.
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-xl">
                Kaay Nafaar transforme tes cours en fiches, quiz et flashcards grâce à l'IA, puis t'aide à
                réviser au bon rythme jusqu'à l'examen.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={lienPrincipal}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-marine hover:bg-marine-clair dark:bg-primary-500 dark:hover:bg-primary-400 px-6 font-semibold text-white shadow-lg shadow-marine/20 transition-transform active:scale-95"
                >
                  {textePrincipal}
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
                <a
                  href="#comment"
                  className="inline-flex h-12 items-center rounded-xl border border-primary-200 dark:border-primary-800 px-6 font-semibold text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/40"
                >
                  Voir comment ça marche
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                {["Gratuit", "Sans carte bancaire", "Tes données t'appartiennent"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary-600" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <ApercuProduit />
          </div>
        </section>

        {/* Formats acceptés */}
        <section aria-labelledby="titre-formats" className="border-y border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col md:flex-row md:items-center gap-5">
            <h2 id="titre-formats" className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-600 dark:text-gray-300 shrink-0">
              Tes cours, quel que soit le format
            </h2>
            <ul className="flex flex-wrap gap-3">
              {FORMATS.map(({ icone: Icone, label }) => (
                <li key={label} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-marine dark:text-white">
                  <Icone className="w-4 h-4 text-primary-600" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary-600">Fonctionnalités</p>
            <h2 className="mt-2 text-4xl font-bold text-marine dark:text-white">
              Tout pour <span className="trait-main">réviser</span>, au même endroit
            </h2>
          </div>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FONCTIONNALITES.map(({ icone: Icone, titre, texte }) => (
              <li key={titre} className="group rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_20px_40px_-24px_rgba(10,31,74,0.35)]">
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 group-hover:-rotate-6 transition-transform">
                  <Icone className="w-6 h-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-marine dark:text-white">{titre}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{texte}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Comment ça marche */}
        <section id="comment" className="scroll-mt-20 fond-teinte">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-primary-600">En 3 étapes</p>
              <h2 className="mt-2 text-4xl font-bold text-marine dark:text-white">
                Comment ça <span className="trait-main">marche</span> ?
              </h2>
            </div>
            <ol className="mt-14 grid gap-6 md:grid-cols-3">
              {ETAPES.map(({ icone: Icone, titre, texte }, i) => (
                <li key={titre} className="relative rounded-3xl bg-white/90 dark:bg-card border border-border p-7">
                  <span className="absolute -top-4 left-7 grid place-items-center w-9 h-9 rounded-full bg-secondary-400 font-display font-bold text-marine">
                    {i + 1}
                  </span>
                  <Icone className="w-8 h-8 text-primary-600" aria-hidden="true" />
                  <h3 className="mt-4 text-xl font-bold text-marine dark:text-white">{titre}</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{texte}</p>
                  {i < ETAPES.length - 1 && (
                    <FlecheCourbe className="hidden md:block absolute -right-14 top-10 w-20 z-10" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pour qui */}
        <section aria-labelledby="titre-publics" className="mx-auto max-w-6xl px-5 py-24 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary-600">Pour qui ?</p>
            <h2 id="titre-publics" className="mt-2 text-4xl font-bold text-marine dark:text-white">
              Du lycée au <span className="trait-main">doctorat</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Que tu prépares le bac, tes partiels ou une soutenance, Kaay Nafaar s'adapte à ton niveau et à tes matières.
            </p>
          </div>
          <ul className="grid gap-4">
            {PUBLICS.map((p) => (
              <li key={p.titre} className="flex gap-5 rounded-3xl border border-border bg-card p-6">
                <GraduationCap className="w-8 h-8 shrink-0 text-primary-600" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-bold text-marine dark:text-white">{p.titre}</h3>
                  <p className="mt-1 text-gray-600 dark:text-gray-300">{p.texte}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Confiance */}
        <section id="confiance" className="scroll-mt-20 mx-auto max-w-6xl px-5 pb-24">
          <div className="rounded-[2rem] border border-border bg-card p-8 md:p-12">
            <h2 className="text-3xl font-bold text-marine dark:text-white">
              Une plateforme <span className="trait-main">sérieuse</span> avec tes données
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              <li>
                <Lock className="w-7 h-7 text-primary-600" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-marine dark:text-white">Sécurisée</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Bonnes pratiques OWASP, mots de passe chiffrés, fichiers accessibles à toi seul.
                </p>
              </li>
              <li>
                <Download className="w-7 h-7 text-primary-600" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-marine dark:text-white">Tes données, tes droits</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Export et suppression en un clic, conformément à la loi sénégalaise 2008-12 et au RGPD.
                </p>
              </li>
              <li>
                <Accessibility className="w-7 h-7 text-primary-600" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-marine dark:text-white">Accessible</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Navigation au clavier, contrastes lisibles et compatibilité lecteurs d'écran (WCAG 2.2).
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* Bandeau d'appel à l'action */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="surface-marque rounded-[2rem] px-8 py-14 md:px-14 grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Prêt à réviser malin ?</h2>
              <p className="mt-3 text-lg text-primary-100 max-w-xl">
                Crée ton compte en moins d'une minute et importe ton premier cours.
              </p>
            </div>
            <Link
              to={lienPrincipal}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-secondary-400 hover:bg-secondary-300 px-6 font-semibold text-marine transition-transform active:scale-95"
            >
              {textePrincipal}
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 mx-auto max-w-3xl px-5 pb-24">
          <h2 className="text-center text-4xl font-bold text-marine dark:text-white">
            Questions <span className="trait-main">fréquentes</span>
          </h2>
          <div className="mt-12 space-y-3">
            {FAQ.map(({ q, r }) => (
              <details key={q} className="group rounded-2xl border border-border bg-card px-6 py-4 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-marine dark:text-white">
                  {q}
                  <span className="grid place-items-center w-7 h-7 shrink-0 rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-600 transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-gray-600 dark:text-gray-300">{r}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <LogoComplet className="w-40" />
            <p className="mt-4 max-w-sm text-sm text-gray-600 dark:text-gray-300">
              La plateforme de révision intelligente pensée pour les étudiants d'Afrique et d'ailleurs.
            </p>
          </div>
          <nav aria-label="Liens du produit">
            <h2 className="text-sm font-bold text-marine dark:text-white">Produit</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li><a href="#fonctionnalites" className="hover:text-primary-600">Fonctionnalités</a></li>
              <li><a href="#comment" className="hover:text-primary-600">Comment ça marche</a></li>
              <li><a href="#faq" className="hover:text-primary-600">FAQ</a></li>
            </ul>
          </nav>
          <nav aria-label="Compte et informations légales">
            <h2 className="text-sm font-bold text-marine dark:text-white">Compte</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li><Link to="/inscription" className="hover:text-primary-600">Créer un compte</Link></li>
              <li><Link to="/connexion" className="hover:text-primary-600">Se connecter</Link></li>
              <li><Link to="/confidentialite" className="hover:text-primary-600">Politique de confidentialité</Link></li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-border py-5 text-center text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Kaay Nafaar · Conçu à Dakar, Sénégal
        </p>
      </footer>
    </div>
  );
}
