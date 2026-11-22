import { formatMessage, renderInline } from "../assistant/formatMessage";
import LecteurPodcast from "./LecteurPodcast";

/* Rendu des productions du studio. Tout le texte vient de l'IA : il est affiché
   comme du texte (React échappe), seules les formules passent par KaTeX. */

function CarteMentale({ centre, branches = [] }) {
  const Noeud = ({ noeud, niveau }) => (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[1.05rem] before:w-3.5 before:border-t-[1.5px] before:border-encre/40 dark:before:border-foreground/30">
      <span
        className={
          niveau === 1
            ? "inline-block my-1 rounded-sm border border-encre/70 dark:border-foreground/40 bg-card px-3 py-1 font-display text-lg font-semibold text-foreground shadow-sm"
            : niveau === 2
              ? "inline-block my-0.5 rounded-sm bg-secondary/40 px-2 py-0.5 text-foreground"
              : "inline-block my-0.5 text-foreground/80 text-sm"
        }
      >
        {noeud.titre}
      </span>
      {noeud.enfants?.length > 0 && (
        <ul className="ml-3 border-l-[1.5px] border-encre/40 dark:border-foreground/30">
          {noeud.enfants.map((e, i) => (
            <Noeud key={i} noeud={e} niveau={niveau + 1} />
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <div className="overflow-x-auto">
      <p className="inline-block rounded-full border-2 border-encre dark:border-foreground/70 bg-surligneur text-encre px-4 py-1.5 font-display text-xl font-semibold">
        {centre}
      </p>
      <ul className="mt-2 ml-5 border-l-[1.5px] border-encre/40 dark:border-foreground/30">
        {branches.map((b, i) => (
          <Noeud key={i} noeud={b} niveau={1} />
        ))}
      </ul>
    </div>
  );
}

function Frise({ titre, elements = [] }) {
  return (
    <div>
      {titre && <p className="font-display text-xl text-foreground mb-4">{titre}</p>}
      <ol className="relative border-l-2 border-marge/60 ml-2">
        {elements.map((e, i) => (
          <li key={i} className="relative pl-6 pb-6 last:pb-0">
            <span aria-hidden="true" className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-card border-2 border-marge" />
            <p className="etiquette text-marge">{e.repere}</p>
            <p className="font-display text-lg font-semibold text-foreground">{e.titre}</p>
            {e.description && <p className="text-foreground/80 mt-0.5">{renderInline(e.description)}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Faq({ questions = [] }) {
  return (
    <div className="border-t border-encre/70 dark:border-foreground/40">
      {questions.map((q, i) => (
        <details key={i} className="group border-b border-border">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3.5 font-semibold text-foreground">
            <span>
              <span className="chiffres text-muted-foreground mr-2">{i + 1}.</span>
              {q.question}
            </span>
            <span aria-hidden="true" className="text-xl leading-none text-primary transition-transform group-open:rotate-45">
              +
            </span>
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
        <div key={i} className="border-b border-border py-3">
          <dt className="font-display text-lg font-semibold text-foreground">{t.terme}</dt>
          <dd className="text-foreground/80">{renderInline(t.definition)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Synthese({ titre, texte }) {
  return (
    <article>
      {titre && <h3 className="font-display text-2xl text-foreground mb-2">{titre}</h3>}
      <div className="leading-relaxed">{formatMessage(texte)}</div>
    </article>
  );
}

export default function ProductionStudio({ type, contenu }) {
  if (!contenu) return null;
  switch (type) {
    case "synthese":
      return <Synthese {...contenu} />;
    case "carte_mentale":
      return <CarteMentale {...contenu} />;
    case "frise":
      return <Frise {...contenu} />;
    case "faq":
      return <Faq {...contenu} />;
    case "glossaire":
      return <Glossaire {...contenu} />;
    case "podcast":
      return <LecteurPodcast {...contenu} />;
    default:
      return null;
  }
}
