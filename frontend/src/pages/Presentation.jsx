import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lock, Download, Accessibility } from "lucide-react";
import { useAuth } from "../App";
import Logo, { LogoComplet } from "../components/marque/Logo";
import BoutonInstaller from "../components/BoutonInstaller";

/* ── Contenu ─────────────────────────────────────────────────────── */

const FONCTIONNALITES = [
  { titre: "Fiches de révision", texte: "L'essentiel de ton cours sur une fiche : résumé, notions clés, définitions et points à retenir." },
  { titre: "Quiz notés sur 20", texte: "Des questions tirées de tes propres cours, avec la correction détaillée de chaque réponse." },
  { titre: "Flashcards espacées", texte: "Répétition espacée (SM-2) : chaque carte revient au moment où tu allais l'oublier." },
  { titre: "Assistant de révision", texte: "Il répond d'abord à partir de tes cours, puis du web si besoin, et cite toujours ses sources." },
  { titre: "Planning jusqu'à l'examen", texte: "Organise tes séances jour par jour et coche ce qui est fait." },
  { titre: "Bulletin de progression", texte: "Moyenne, série de jours, cartes maîtrisées : tu vois ce qu'il reste à travailler." },
  { titre: "Bibliothèque partagée", texte: "Récupère les fiches publiées par d'autres étudiants, en un clic." },
  { titre: "Export et impression", texte: "Tes fiches en PDF ou en page imprimable, pour réviser sans connexion." },
];

const ETAPES = [
  { titre: "Importe ton cours", texte: "Un PDF, une photo de ton cahier (le texte est reconnu) ou un copier-coller." },
  { titre: "L'IA prépare tes fiches", texte: "En quelques secondes : fiche structurée, quiz et flashcards tirés de ton contenu." },
  { titre: "Tu révises au bon rythme", texte: "Quiz, flashcards et planning, jusqu'au jour de l'examen." },
];

const PUBLICS = [
  { titre: "Lycée", texte: "Prépare le bac matière par matière, avec un quiz court chaque jour." },
  { titre: "Licence", texte: "Absorbe les cours du semestre et arrive aux partiels avec tes fiches prêtes." },
  { titre: "Master et doctorat", texte: "Synthétise articles et supports, et interroge l'assistant sur tes documents." },
];

const FAQ = [
  { q: "Kaay Nafaar est-il gratuit ?", r: "Oui, la création de compte et les fonctionnalités de révision sont gratuites, sans carte bancaire." },
  { q: "Quels documents puis-je importer ?", r: "Des PDF, des images (JPG, PNG) comme une photo de ton cahier grâce à la reconnaissance de texte, et du texte brut. Jusqu'à 50 Mo par fichier." },
  { q: "Mes cours sont-ils privés ?", r: "Oui. Tes fichiers ne sont accessibles qu'à toi. Tu peux exporter toutes tes données ou supprimer ton compte à tout moment depuis ton profil." },
  { q: "Comment l'IA utilise-t-elle mes cours ?", r: "Des extraits de tes cours sont envoyés à des fournisseurs d'IA uniquement pour générer tes fiches, quiz et réponses. Tout est détaillé dans la politique de confidentialité." },
  { q: "Je peux l'installer sur mon téléphone ?", r: "Oui. Kaay Nafaar s'installe comme une application, sur Android, iPhone et ordinateur : icône sur l'écran d'accueil, plein écran, et ouverture même avec une connexion faible." },
];

/* ── Illustration : la table de travail (en HTML, aucune image) ─── */

function TableDeTravail() {
  return (
    <div className="relative mx-auto w-full max-w-[30rem] h-[25rem] sm:h-[27rem]" aria-hidden="true">
      {/* Fiche bristol */}
      <div className="absolute left-0 top-6 w-[82%] -rotate-[4deg] bg-card border border-border rounded-md shadow-lg">
        <div className="px-5 pt-4 pb-3 border-b-2 border-marge/60">
          <p className="etiquette">Bases de données</p>
          <p className="font-display text-xl font-semibold mt-0.5">Les formes normales</p>
        </div>
        <div className="px-5 py-2 leading-7 text-[0.92rem] text-foreground/85 bg-[linear-gradient(to_bottom,transparent_calc(1.75rem-1px),hsl(var(--seyes-fort))_calc(1.75rem-1px))] bg-[length:100%_1.75rem]">
          <p>Une relation est en <span className="surligne">3FN</span> si elle est en 2FN</p>
          <p>et sans dépendance <span className="surligne">transitive</span>.</p>
          <p className="text-muted-foreground">1FN → 2FN → 3FN → BCNF</p>
        </div>
      </div>

      {/* Copie de quiz notée */}
      <div className="absolute right-0 top-[45%] w-[66%] rotate-[3deg] bg-card border border-border rounded-md shadow-xl px-5 py-4">
        <p className="etiquette">Quiz · question 3 / 10</p>
        <p className="mt-1 font-semibold leading-snug">Quelle forme normale élimine les dépendances transitives ?</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {["1FN", "2FN", "3FN", "BCNF"].map((r) => (
            <span
              key={r}
              className={
                r === "3FN"
                  ? "rounded-sm border border-encre/80 bg-secondary px-2 py-1 font-semibold text-encre"
                  : "rounded-sm border border-border px-2 py-1"
              }
            >
              {r === "3FN" ? "✓ " : ""}
              {r}
            </span>
          ))}
        </div>
        <div className="absolute -top-7 -right-4 w-[4.6rem] h-[4.6rem] -rotate-[10deg] text-marge">
          <svg viewBox="0 0 72 72" className="absolute inset-0">
            <path d="M36 5c17 0 31 13 31 30S53 67 35 67 5 54 6 36 19 4 38 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="font-display text-2xl font-semibold">17</span>
            <span className="text-xs font-semibold">/20</span>
          </span>
        </div>
      </div>

      {/* Post-it */}
      <div className="absolute left-[6%] bottom-0 w-44 rotate-[-6deg] bg-surligneur px-4 py-3 shadow-lg text-encre">
        <p className="font-display italic text-lg leading-snug" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
          Revoir les flashcards demain à 18 h !
        </p>
      </div>
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
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:font-semibold"
      >
        Aller au contenu principal
      </a>

      {/* En-tête */}
      <header className="sticky top-0 z-40 bg-background/95 border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between gap-4">
          <Link to="/presentation" aria-label="Kaay Nafaar, accueil" className="rounded-md">
            <Logo />
          </Link>
          <nav aria-label="Sections de la page" className="hidden md:flex items-center gap-7 text-[0.95rem] text-foreground/80">
            <a href="#fonctionnalites" className="hover:text-primary underline-offset-4 hover:underline">Fonctionnalités</a>
            <a href="#methode" className="hover:text-primary underline-offset-4 hover:underline">La méthode</a>
            <a href="#confiance" className="hover:text-primary underline-offset-4 hover:underline">Confiance</a>
            <a href="#faq" className="hover:text-primary underline-offset-4 hover:underline">Questions</a>
          </nav>
          <div className="flex items-center gap-2">
            {!utilisateur && (
              <Link to="/connexion" className="hidden sm:inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-foreground hover:bg-foreground/[0.06]">
                Se connecter
              </Link>
            )}
            <Link to={lienPrincipal} className="btn-primary h-10 py-0 px-4 text-sm">
              {utilisateur ? "Tableau de bord" : "S'inscrire"}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        {/* Héros : une page de cahier, la marge rouge à gauche */}
        <section className="page-cahier overflow-hidden [--marge-x:1.25rem] md:[--marge-x:calc(50%-36rem)] border-b border-border">
          <div className="mx-auto max-w-6xl px-5 pl-10 md:pl-12 pt-14 pb-20 md:pt-20 md:pb-24 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="apparition">
              <p className="etiquette">Plateforme de révision · conçue à Dakar</p>
              <h1 className="mt-4 text-[2.9rem] sm:text-6xl lg:text-[4.4rem] leading-[0.98] text-foreground">
                Révise moins longtemps,
                <span className="block mt-1">
                  <span className="surligne">retiens mieux</span>.
                </span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-foreground/80 max-w-xl">
                Kaay Nafaar transforme tes cours en fiches, en quiz et en flashcards, puis te fait réviser au bon moment,
                jusqu'au jour de l'examen.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={lienPrincipal} className="btn-primary h-12 px-6 text-base">
                  {textePrincipal}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <BoutonInstaller variante="contour" />
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/75">
                {["Gratuit", "Sans carte bancaire", "Tes données t'appartiennent"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <TableDeTravail />
          </div>
        </section>

        {/* Formats acceptés */}
        <section aria-labelledby="titre-formats" className="bg-card border-b border-border">
          <div className="mx-auto max-w-6xl px-5 py-6 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <h2 id="titre-formats" className="annotation text-lg font-normal">Tu importes :</h2>
            {["un PDF", "une photo de ton cahier", "un copier-coller", "une fiche de la bibliothèque"].map((f) => (
              <span key={f} className="font-display text-lg text-foreground">{f}</span>
            ))}
          </div>
        </section>

        {/* Fonctionnalités : un sommaire numéroté */}
        <section id="fonctionnalites" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-28 self-start">
              <p className="etiquette">Sommaire</p>
              <h2 className="mt-3 text-4xl md:text-5xl leading-[1.05]">
                Tout pour <span className="surligne">réviser</span>, au même endroit.
              </h2>
              <p className="mt-5 text-lg text-foreground/75 max-w-md">
                Pas dix applications : ton cahier de révision, du premier cours jusqu'au dernier quiz.
              </p>
            </div>
            <ol className="border-t border-encre/80 dark:border-foreground/40">
              {FONCTIONNALITES.map(({ titre, texte }, i) => (
                <li key={titre} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-b border-border py-5">
                  <span className="font-display italic text-3xl text-primary leading-none pt-0.5 chiffres" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-xl leading-snug">{titre}</h3>
                    <p className="mt-1 text-foreground/75">{texte}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* La méthode : au tableau noir */}
        <section id="methode" className="scroll-mt-20 surface-marque">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-papier/70">La méthode</p>
            <h2 className="mt-3 text-4xl md:text-5xl text-papier">
              Trois temps, <span className="italic font-normal">comme en classe.</span>
            </h2>
            <ol className="mt-14 grid gap-10 md:grid-cols-3">
              {ETAPES.map(({ titre, texte }, i) => (
                <li key={titre} className="border-t border-papier/25 pt-6">
                  <span className="font-display text-6xl leading-none text-surligneur chiffres" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-2xl text-papier">{titre}</h3>
                  <p className="mt-2 text-papier/80">{texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Publics */}
        <section aria-labelledby="titre-publics" className="mx-auto max-w-6xl px-5 py-24">
          <h2 id="titre-publics" className="text-4xl md:text-5xl max-w-2xl leading-[1.05]">
            Du lycée au <span className="surligne">doctorat</span>.
          </h2>
          <div className="mt-12 grid gap-px bg-border border border-border rounded-lg overflow-hidden md:grid-cols-3 shadow-md">
            {PUBLICS.map(({ titre, texte }) => (
              <div key={titre} className="bg-card p-7">
                <h3 className="text-2xl">{titre}</h3>
                <p className="mt-3 text-foreground/75">{texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Confiance */}
        <section id="confiance" className="scroll-mt-20 mx-auto max-w-6xl px-5 pb-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start border-t border-encre/80 dark:border-foreground/40 pt-10">
            <h2 className="text-4xl leading-[1.05]">
              Sérieux avec <span className="italic font-normal">tes données.</span>
            </h2>
            <ul className="grid gap-8 sm:grid-cols-3">
              {[
                { icone: Lock, titre: "Sécurisé", texte: "Session protégée, mots de passe chiffrés, bonnes pratiques OWASP. Tes fichiers ne sont visibles que par toi." },
                { icone: Download, titre: "Tes droits", texte: "Export et suppression de tes données en un clic, conformément à la loi sénégalaise 2008-12 et au RGPD." },
                { icone: Accessibility, titre: "Accessible", texte: "Navigation au clavier, contrastes lisibles et lecteurs d'écran (WCAG 2.2)." },
              ].map(({ icone: Icone, titre, texte }) => (
                <li key={titre}>
                  <Icone className="w-6 h-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-xl">{titre}</h3>
                  <p className="mt-2 text-sm text-foreground/75">{texte}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Appel final : un grand post-it */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="relative mx-auto max-w-3xl bg-surligneur text-encre px-8 py-10 md:px-14 md:py-14 shadow-xl -rotate-[1.2deg]">
            <span aria-hidden="true" className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-papier/70 border border-encre/10 rotate-[2deg]" />
            <h2 className="text-4xl md:text-5xl text-encre">Prêt à réviser malin ?</h2>
            <p className="mt-3 text-lg text-encre/85">Crée ton compte en moins d'une minute et importe ton premier cours.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={lienPrincipal} className="btn-primary h-12 px-6 text-base">
                {textePrincipal}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Questions fréquentes */}
        <section id="faq" className="scroll-mt-20 mx-auto max-w-3xl px-5 pb-24">
          <h2 className="text-4xl">Questions fréquentes</h2>
          <div className="mt-8 border-t border-encre/80 dark:border-foreground/40">
            {FAQ.map(({ q, r }) => (
              <details key={q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-xl text-foreground">
                  {q}
                  <span className="shrink-0 font-sans text-2xl leading-none text-primary transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pb-5 -mt-1 text-foreground/80">{r}</p>
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
            <p className="mt-4 max-w-sm text-sm text-foreground/75">
              Le cahier de révision intelligent, pensé pour les étudiants d'Afrique et d'ailleurs.
            </p>
          </div>
          <nav aria-label="Liens du produit">
            <h2 className="etiquette">Produit</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              <li><a href="#fonctionnalites" className="hover:text-primary hover:underline underline-offset-4">Fonctionnalités</a></li>
              <li><a href="#methode" className="hover:text-primary hover:underline underline-offset-4">La méthode</a></li>
              <li><a href="#faq" className="hover:text-primary hover:underline underline-offset-4">Questions fréquentes</a></li>
            </ul>
          </nav>
          <nav aria-label="Compte et informations légales">
            <h2 className="etiquette">Compte</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              <li><Link to="/inscription" className="hover:text-primary hover:underline underline-offset-4">Créer un compte</Link></li>
              <li><Link to="/connexion" className="hover:text-primary hover:underline underline-offset-4">Se connecter</Link></li>
              <li><Link to="/confidentialite" className="hover:text-primary hover:underline underline-offset-4">Politique de confidentialité</Link></li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-border py-5 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kaay Nafaar · Conçu à Dakar, Sénégal
        </p>
      </footer>
    </div>
  );
}
