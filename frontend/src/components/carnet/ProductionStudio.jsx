import { useState } from "react";
import { Check, X as Croix, RotateCcw, ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { formatMessage, renderInline } from "../assistant/formatMessage";
import { Button } from "../ui/button";
import LecteurPodcast from "./LecteurPodcast";
import { cn } from "../../lib/utils";

/* Rendu des productions du studio. Tout le texte vient de l'IA : il est affiché
   comme du texte (React échappe), seules les formules passent par KaTeX. */

/* ── Carte mentale : chaque notion est un bouton qui lance une question au carnet ── */

function NoeudCarte({ noeud, niveau, chemin, onNoeud }) {
  const style =
    niveau === 1
      ? "my-1 rounded-xl bg-card px-3 py-1.5 text-base font-semibold text-foreground shadow-sm border border-border"
      : niveau === 2
        ? "my-0.5 rounded-lg bg-secondary px-2.5 py-1 text-[0.9375rem] text-secondary-foreground"
        : "my-0.5 rounded-md px-1.5 py-0.5 text-sm text-foreground/85";
  return (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[1.15rem] before:w-3.5 before:border-t-[1.5px] before:border-border">
      {onNoeud ? (
        <button
          type="button"
          onClick={() => onNoeud(noeud.titre, chemin)}
          title="Demander au carnet"
          className={cn(style, "inline-flex items-center gap-1.5 text-left break-words hover:ring-2 hover:ring-primary/40 focus-visible:ring-2")}
        >
          {noeud.titre}
        </button>
      ) : (
        <span className={cn(style, "inline-block break-words")}>{noeud.titre}</span>
      )}
      {noeud.enfants?.length > 0 && (
        <ul className="ml-3 border-l-[1.5px] border-border">
          {noeud.enfants.map((e, i) => (
            <NoeudCarte key={i} noeud={e} niveau={niveau + 1} chemin={[...chemin, noeud.titre]} onNoeud={onNoeud} />
          ))}
        </ul>
      )}
    </li>
  );
}

function CarteMentale({ centre, branches = [], onNoeud }) {
  return (
    <div className="overflow-x-auto">
      {onNoeud && (
        <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareText className="w-4 h-4" aria-hidden="true" />
          Touche une notion : le carnet te l'explique, sources à l'appui.
        </p>
      )}
      <p className="inline-block rounded-full bg-surligneur text-[#1c1c1e] px-4 py-1.5 text-lg font-bold">{centre}</p>
      <ul className="mt-2 ml-5 border-l-[1.5px] border-border">
        {branches.map((b, i) => (
          <NoeudCarte key={i} noeud={b} niveau={1} chemin={[centre]} onNoeud={onNoeud} />
        ))}
      </ul>
    </div>
  );
}

/* ── Frise, FAQ, glossaire, textes ── */

function Frise({ titre, elements = [] }) {
  return (
    <div>
      {titre && <p className="text-xl font-bold text-foreground mb-4">{titre}</p>}
      <ol className="relative border-l-2 border-primary/40 ml-2">
        {elements.map((e, i) => (
          <li key={i} className="relative pl-6 pb-6 last:pb-0">
            <span aria-hidden="true" className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-card border-2 border-primary" />
            <p className="etiquette text-primary">{e.repere}</p>
            <p className="text-lg font-semibold text-foreground">{e.titre}</p>
            {e.description && <p className="text-foreground/80 mt-0.5">{renderInline(e.description)}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Faq({ questions = [] }) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {questions.map((q, i) => (
        <details key={i} className={cn("group px-4", i > 0 && "border-t border-border")}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3.5 font-semibold text-foreground">
            <span>
              <span className="chiffres text-muted-foreground mr-2">{i + 1}.</span>
              {q.question}
            </span>
            <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
          </summary>
          <div className="pb-4 text-foreground/85">{formatMessage(q.reponse)}</div>
        </details>
      ))}
    </div>
  );
}

function Glossaire({ termes = [] }) {
  return (
    <dl>
      {termes.map((t, i) => (
        <div key={i} className="border-b border-border py-3 last:border-0">
          <dt className="text-lg font-semibold text-foreground">{t.terme}</dt>
          <dd className="text-foreground/80">{renderInline(t.definition)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Texte({ titre, texte }) {
  return (
    <article>
      {titre && <h3 className="text-2xl text-foreground mb-2">{titre}</h3>}
      <div className="leading-relaxed">{formatMessage(texte)}</div>
    </article>
  );
}

/* ── Flashcards : une carte à la fois, retournable, avec bilan ── */

export function CartesRevision({ cartes = [] }) {
  const [index, setIndex] = useState(0);
  const [retournee, setRetournee] = useState(false);
  const [bilan, setBilan] = useState({}); // index → "su" | "revoir"
  if (!cartes.length) return null;
  const carte = cartes[index];
  const sues = Object.values(bilan).filter((v) => v === "su").length;
  const aller = (i) => {
    setIndex((i + cartes.length) % cartes.length);
    setRetournee(false);
  };
  const noter = (valeur) => {
    setBilan((b) => ({ ...b, [index]: valeur }));
    aller(index + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="chiffres">
          Carte {index + 1} / {cartes.length}
        </span>
        <span className="chiffres" aria-live="polite">
          {sues} sue{sues > 1 ? "s" : ""} · {Object.keys(bilan).length - sues} à revoir
        </span>
      </div>
      <button
        type="button"
        onClick={() => setRetournee((r) => !r)}
        aria-label={retournee ? "Revoir la question" : "Retourner la carte pour voir la réponse"}
        className={cn(
          "mt-3 w-full min-h-[11rem] rounded-2xl p-6 text-left shadow-md transition-colors",
          retournee ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
        )}
      >
        <span className={cn("etiquette", retournee && "text-primary-foreground/80")}>{retournee ? "Réponse" : "Question"}</span>
        <span className="mt-2 block text-lg font-semibold leading-snug">{retournee ? carte.reponse : carte.question}</span>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Carte précédente" onClick={() => aller(index - 1)}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        {retournee ? (
          <>
            <Button variant="outline" className="flex-1" onClick={() => noter("revoir")}>
              <RotateCcw aria-hidden="true" />À revoir
            </Button>
            <Button className="flex-1" onClick={() => noter("su")}>
              <Check aria-hidden="true" />
              Je savais
            </Button>
          </>
        ) : (
          <Button variant="secondary" className="flex-1" onClick={() => setRetournee(true)}>
            Voir la réponse
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="Carte suivante" onClick={() => aller(index + 1)}>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/* ── Quiz d'entraînement : correction immédiate et note sur 20 ── */

export function QuizPratique({ questions = [] }) {
  const [reponses, setReponses] = useState({});
  const repondues = Object.keys(reponses).length;
  const justes = questions.filter((q, i) => reponses[i] === q.reponseCorrecte).length;
  const fini = repondues === questions.length && questions.length > 0;

  return (
    <div className="space-y-5">
      {questions.map((q, i) => {
        const choix = reponses[i];
        return (
          <fieldset key={i} className="rounded-2xl border border-border p-4">
            <legend className="px-1 font-semibold text-foreground">
              <span className="chiffres text-muted-foreground mr-1.5">{i + 1}.</span>
              {q.question}
            </legend>
            <div className="mt-2 grid gap-2">
              {q.options.map((o) => {
                const estBonne = o === q.reponseCorrecte;
                const etat = choix === undefined ? null : estBonne ? "bonne" : o === choix ? "fausse" : null;
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={choix !== undefined}
                    aria-pressed={choix === o}
                    onClick={() => setReponses((r) => ({ ...r, [i]: o }))}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-left min-h-[44px] transition-colors border",
                      etat === "bonne" && "border-succes bg-succes/15 text-foreground",
                      etat === "fausse" && "border-destructive bg-destructive/10 text-foreground",
                      !etat && "border-border bg-card hover:bg-muted disabled:opacity-70"
                    )}
                  >
                    {etat === "bonne" && <Check className="w-4 h-4 text-succes shrink-0" aria-label="Bonne réponse" />}
                    {etat === "fausse" && <Croix className="w-4 h-4 text-destructive shrink-0" aria-label="Ta réponse, fausse" />}
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
            {choix !== undefined && q.explication && (
              <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
                {renderInline(q.explication)}
              </p>
            )}
          </fieldset>
        );
      })}
      <p role="status" className="rounded-xl bg-muted px-4 py-3 font-semibold chiffres">
        {fini
          ? `Note : ${Math.round((justes / questions.length) * 20)}/20 (${justes} sur ${questions.length})`
          : `${repondues} / ${questions.length} réponses`}
      </p>
      {fini && (
        <Button variant="ghost" onClick={() => setReponses({})}>
          <RotateCcw aria-hidden="true" />
          Recommencer
        </Button>
      )}
    </div>
  );
}

export default function ProductionStudio({ type, contenu, options, onNoeud, onQuestionAudio }) {
  if (!contenu) return null;
  switch (type) {
    case "synthese":
    case "rapport":
      return <Texte {...contenu} />;
    case "carte_mentale":
      return <CarteMentale {...contenu} onNoeud={onNoeud} />;
    case "frise":
      return <Frise {...contenu} />;
    case "faq":
      return <Faq {...contenu} />;
    case "glossaire":
      return <Glossaire {...contenu} />;
    case "flashcards":
      return <CartesRevision cartes={contenu.cartes} />;
    case "quiz":
      return <QuizPratique questions={contenu.questions} />;
    case "podcast":
      return <LecteurPodcast {...contenu} langue={options?.langue} onQuestion={onQuestionAudio} />;
    default:
      return null;
  }
}
