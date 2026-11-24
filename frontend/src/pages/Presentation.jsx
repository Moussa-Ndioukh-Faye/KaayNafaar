import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lock, Download, Accessibility, FileText, BrainCircuit, Layers, MessageSquare, Calendar, BarChart3, Globe, NotebookPen, Headphones, ChevronRight } from "lucide-react";
import { useAuth } from "../App";
import Logo, { LogoComplet } from "../components/marque/Logo";
import BoutonInstaller from "../components/BoutonInstaller";

/* ── Contenu ─────────────────────────────────────────────────────── */

const FONCTIONNALITES = [
  { titre: "Fiches de révision", texte: "L'essentiel de ton cours : résumé, notions clés, définitions. Exportables en PDF.", icone: FileText, teinte: "bg-[#f5c400] text-[#1c1c1e]" },
  { titre: "Quiz notés sur 20", texte: "Des questions tirées de tes propres cours, avec la correction de chaque réponse.", icone: BrainCircuit, teinte: "bg-[#cf1820]" },
  { titre: "Flashcards espacées", texte: "Chaque carte revient au moment où tu allais l'oublier (SM-2).", icone: Layers, teinte: "bg-[#e8590c]" },
  { titre: "Carnets et sources", texte: "Regroupe tes cours, pose tes questions : chaque réponse cite ses passages.", icone: NotebookPen, teinte: "bg-[#00853f]" },
  { titre: "Résumé audio", texte: "Un dialogue à deux voix sur tes cours, à écouter dans le car rapide.", icone: Headphones, teinte: "bg-[#d63384]" },
  { titre: "Assistant de révision", texte: "Il répond d'abord à partir de tes cours, puis du web, et cite ses sources.", icone: MessageSquare, teinte: "bg-[#5b4bdb]" },
  { titre: "Planning jusqu'à l'examen", texte: "Organise tes séances jour par jour et coche ce qui est fait.", icone: Calendar, teinte: "bg-[#0b7f9e]" },
  { titre: "Progression", texte: "Moyenne, série de jours, cartes maîtrisées : tu vois ce qu'il reste à travailler.", icone: BarChart3, teinte: "bg-[#2f9e44]" },
  { titre: "Bibliothèque partagée", texte: "Récupère les fiches publiées par d'autres étudiants, en un clic.", icone: Globe, teinte: "bg-[#0047db]" },
];

const ETAPES = [
  { titre: "Importe ton cours", texte: "PDF, Word, PowerPoint, photo de ton cahier, page web ou copier-coller." },
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
  { q: "Quels documents puis-je importer ?", r: "Des PDF, des fichiers Word et PowerPoint, des images (JPG, PNG) comme une photo de ton cahier grâce à la reconnaissance de texte, des pages web et du texte brut. Jusqu'à 50 Mo par fichier." },
  { q: "Mes cours sont-ils privés ?", r: "Oui. Tes fichiers ne sont accessibles qu'à toi. Tu peux exporter toutes tes données ou supprimer ton compte à tout moment depuis ton profil." },
  { q: "Comment l'IA utilise-t-elle mes cours ?", r: "Des extraits de tes cours sont envoyés à des fournisseurs d'IA uniquement pour générer tes fiches, quiz et réponses. Tout est détaillé dans la politique de confidentialité." },
  { q: "Je peux l'installer sur mon téléphone ?", r: "Oui. Kaay Nafaar s'installe comme une application, sur Android, iPhone et ordinateur : icône sur l'écran d'accueil, plein écran, et ouverture même avec une connexion faible." },
];

/* ── Illustration : aperçu de l'application (en HTML, aucune image) ─── */

function ApercuApp() {
  return (
    <div className="relative mx-auto w-full max-w-[30rem]" aria-hidden="true">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/15 via-transparent to-succes/15 blur-2xl" />
      <div className="rounded-[2rem] bg-card p-3 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="rounded-[1.4rem] bg-background p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="etiquette">Bases de données</p>
              <p className="text-xl font-bold tracking-tight">Les formes normales</p>
            </div>
            <span className="grid place-items-center w-9 h-9 rounded-[10px] bg-[#f5c400] text-[#1c1c1e]">
              <FileText className="w-5 h-5" />
            </span>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-sm text-[0.92rem] leading-relaxed">
            <p>
              Une relation est en <span className="font-semibold text-primary">3FN</span> si elle est en 2FN et sans
              dépendance <span className="font-semibold text-primary">transitive</span>.
            </p>
            <p className="mt-1 text-muted-foreground">1FN → 2FN → 3FN → BCNF</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="etiquette">Quiz · 3 / 10</p>
              <span className="rounded-full bg-succes/15 px-2.5 py-0.5 text-xs font-bold text-succes">17/20</span>
            </div>
            <p className="mt-1 font-semibold leading-snug">Quelle forme normale élimine les dépendances transitives ?</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {["1FN", "2FN", "3FN", "BCNF"].map((r) => (
                <span
                  key={r}
                  className={
                    r === "3FN"
                      ? "flex items-center gap-1.5 rounded-xl bg-succes px-3 py-2 font-semibold text-white dark:text-black"
                      : "rounded-xl bg-muted px-3 py-2"
                  }
                >
                  {r === "3FN" && <Check className="w-4 h-4" />}
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
            <span className="grid place-items-center w-9 h-9 rounded-[10px] bg-[#d63384] text-white">
              <Headphones className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Résumé audio · 4 min</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                <div className="h-full w-2/5 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
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
      <header className="sticky top-0 z-40 barre-verre border-b border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between gap-4">
          <Link to="/presentation" aria-label="Kaay Nafaar, accueil" className="rounded-md">
            <Logo />
          </Link>
          <nav aria-label="Sections de la page" className="hidden md:flex items-center gap-7 text-sm text-foreground/80">
            <a href="#fonctionnalites" className="hover:text-foreground">Fonctionnalités</a>
            <a href="#methode" className="hover:text-foreground">La méthode</a>
            <a href="#confiance" className="hover:text-foreground">Confiance</a>
            <a href="#faq" className="hover:text-foreground">Questions</a>
          </nav>
          <div className="flex items-center gap-2">
            {!utilisateur && (
              <Link to="/connexion" className="hidden sm:inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-foreground hover:bg-foreground/[0.06]">
                Se connecter
              </Link>
            )}
            <Link to={lienPrincipal} className="btn-primary h-9 rounded-full py-0 px-4 text-sm">
              {utilisateur ? "Tableau de bord" : "S'inscrire"}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        {/* Héros façon page produit */}
        <section className="overflow-hidden">
          <div className="mx-auto max-w-6xl px-5 pt-14 pb-20 md:pt-20 md:pb-24 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="apparition">
              <p className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-medium shadow-sm">
                <span className="bande-senegal w-5 rounded-full" aria-hidden="true" />
                Conçue à Dakar, pour les étudiants
              </p>
              <h1 className="mt-5 text-[2.75rem] sm:text-6xl lg:text-[4.25rem] leading-[1.02] text-foreground">
                Révise moins longtemps.
                <span className="block text-primary">Retiens mieux.</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
                Kaay Nafaar transforme tes cours en fiches, quiz, flashcards et résumés audio, puis te fait réviser au
                bon moment, jusqu'au jour de l'examen.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={lienPrincipal} className="btn-primary h-12 rounded-full px-6 text-base">
                  {textePrincipal}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <BoutonInstaller variante="contour" />
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Gratuit", "Sans carte bancaire", "Tes données t'appartiennent"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-succes" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <ApercuApp />
          </div>
        </section>

        {/* Fonctionnalités : grille de tuiles */}
        <section id="fonctionnalites" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl leading-[1.05]">
              Tout pour réviser.
              <span className="block text-muted-foreground">Au même endroit.</span>
            </h2>
          </div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FONCTIONNALITES.map(({ titre, texte, icone: Icone, teinte }) => (
              <li key={titre} className="rounded-2xl bg-card p-6 shadow-sm">
                <span aria-hidden="true" className={`grid place-items-center w-11 h-11 rounded-[12px] text-white ${teinte}`}>
                  <Icone className="w-6 h-6" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-lg">{titre}</h3>
                <p className="mt-1.5 text-muted-foreground">{texte}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* La méthode : surface de marque, motif wax et bande tricolore */}
        <section id="methode" className="scroll-mt-20 surface-marque">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/70">La méthode</p>
            <h2 className="mt-3 text-4xl md:text-5xl text-white">Trois temps, comme en classe.</h2>
            <ol className="mt-14 grid gap-5 md:grid-cols-3">
              {ETAPES.map(({ titre, texte }, i) => (
                <li key={titre} className="rounded-2xl bg-white/[0.07] p-6 ring-1 ring-white/10">
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-surligneur text-lg font-bold text-[#1c1c1e] chiffres" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-2xl text-white">{titre}</h3>
                  <p className="mt-2 text-white/80">{texte}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Publics */}
        <section aria-labelledby="titre-publics" className="mx-auto max-w-6xl px-5 py-24">
          <h2 id="titre-publics" className="text-4xl md:text-5xl max-w-2xl leading-[1.05]">
            Du lycée au doctorat.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PUBLICS.map(({ titre, texte }) => (
              <div key={titre} className="rounded-2xl bg-card p-7 shadow-sm">
                <h3 className="text-2xl">{titre}</h3>
                <p className="mt-3 text-muted-foreground">{texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Confiance */}
        <section id="confiance" className="scroll-mt-20 mx-auto max-w-6xl px-5 pb-24">
          <h2 className="text-4xl leading-[1.05]">Sérieux avec tes données.</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icone: Lock, titre: "Sécurisé", texte: "Session protégée, mots de passe chiffrés, bonnes pratiques OWASP. Tes fichiers ne sont visibles que par toi.", teinte: "bg-[#0047db]" },
              { icone: Download, titre: "Tes droits", texte: "Export et suppression de tes données en un clic, conformément à la loi sénégalaise 2008-12 et au RGPD.", teinte: "bg-[#00853f]" },
              { icone: Accessibility, titre: "Accessible", texte: "Navigation au clavier, contrastes lisibles et lecteurs d'écran (WCAG 2.2).", teinte: "bg-[#5b4bdb]" },
            ].map(({ icone: Icone, titre, texte, teinte }) => (
              <li key={titre} className="rounded-2xl bg-card p-6 shadow-sm">
                <span aria-hidden="true" className={`grid place-items-center w-11 h-11 rounded-[12px] text-white ${teinte}`}>
                  <Icone className="w-6 h-6" />
                </span>
                <h3 className="mt-4 text-xl">{titre}</h3>
                <p className="mt-2 text-muted-foreground">{texte}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Appel final */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="surface-marque rounded-[2rem] px-8 py-14 md:px-16 md:py-20 text-center">
            <h2 className="text-4xl md:text-5xl text-white">Prêt à réviser malin ?</h2>
            <p className="mt-4 text-lg text-white/80">Crée ton compte en moins d'une minute et importe ton premier cours.</p>
            <div className="mt-8 flex justify-center">
              <Link to={lienPrincipal} className="inline-flex items-center gap-2 h-12 rounded-full bg-white px-7 text-base font-semibold text-[#0a1f4a] hover:bg-white/90 active:scale-[0.98] transition-transform">
                {textePrincipal}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Questions fréquentes */}
        <section id="faq" className="scroll-mt-20 mx-auto max-w-3xl px-5 pb-24">
          <h2 className="text-4xl">Questions fréquentes</h2>
          <div className="mt-8 rounded-2xl bg-card shadow-sm overflow-hidden">
            {FAQ.map(({ q, r }, i) => (
              <details key={q} className={`group px-5 ${i > 0 ? "border-t border-border" : ""}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.0625rem] font-semibold text-foreground">
                  {q}
                  <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                </summary>
                <p className="pb-4 -mt-1 text-muted-foreground">{r}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="bg-card">
        <div className="bande-senegal" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-5 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <LogoComplet className="w-40" />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              La plateforme de révision intelligente, pensée pour les étudiants d'Afrique et d'ailleurs.
            </p>
          </div>
          <nav aria-label="Liens du produit">
            <h2 className="etiquette">Produit</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              <li><a href="#fonctionnalites" className="hover:text-primary">Fonctionnalités</a></li>
              <li><a href="#methode" className="hover:text-primary">La méthode</a></li>
              <li><a href="#faq" className="hover:text-primary">Questions fréquentes</a></li>
            </ul>
          </nav>
          <nav aria-label="Compte et informations légales">
            <h2 className="etiquette">Compte</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              <li><Link to="/inscription" className="hover:text-primary">Créer un compte</Link></li>
              <li><Link to="/connexion" className="hover:text-primary">Se connecter</Link></li>
              <li><Link to="/confidentialite" className="hover:text-primary">Politique de confidentialité</Link></li>
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
