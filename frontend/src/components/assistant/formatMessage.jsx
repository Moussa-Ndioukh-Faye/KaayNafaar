import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Mise en forme légère des réponses de l'IA (sous-ensemble de Markdown) :
 * titres ## et ###, listes « - » ou « • », gras **texte**, formules LaTeX $…$ et $$…$$,
 * et citations [n] cliquables (chat des carnets).
 *
 * Sécurité : aucun HTML venant de l'IA n'est interprété. Seul KaTeX produit du HTML,
 * à partir de la formule, avec `trust: false` (pas de liens, d'images ni de classes arbitraires).
 */

const OPTIONS_KATEX = { throwOnError: false, trust: false, strict: "ignore", output: "htmlAndMathml", maxSize: 20, maxExpand: 200 };

function Formule({ source, bloc = false }) {
  const html = katex.renderToString(source, { ...OPTIONS_KATEX, displayMode: bloc });
  const Balise = bloc ? "div" : "span";
  return (
    <Balise
      className={bloc ? "my-3 overflow-x-auto" : undefined}
      // KaTeX génère un HTML sûr (trust: false) ; aucun texte brut de l'IA n'est injecté
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const MOTIF = /(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*|\[\d{1,2}\])/g;

/** Gras, formules et citations à l'intérieur d'une ligne */
export const renderInline = (text, options = {}) => {
  if (!text) return "";
  const { surCitation, passages } = options;
  return text.split(MOTIF).map((part, index) => {
    if (!part) return null;
    if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
      return <Formule key={index} source={part.slice(2, -2)} bloc />;
    }
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      return <Formule key={index} source={part.slice(1, -1)} />;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const citation = part.match(/^\[(\d{1,2})\]$/);
    if (citation) {
      const n = Number(citation[1]);
      const passage = passages?.find((p) => p.n === n);
      if (surCitation && passage) {
        return (
          <button
            key={index}
            type="button"
            onClick={() => surCitation(passage)}
            className="mx-0.5 inline-grid place-items-center min-w-[1.5rem] h-6 px-1 align-baseline rounded-sm border border-primary/40 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
            aria-label={`Source ${n} : ${passage.titre}`}
          >
            {n}
          </button>
        );
      }
    }
    return part;
  });
};

const estElementDeListe = (ligne) => ligne.startsWith("- ") || ligne.startsWith("• ");

export const formatMessage = (texte, options = {}) => {
  if (!texte) return null;

  const blocs = [];
  let liste = null; // éléments <li> consécutifs, regroupés dans un vrai <ul>

  texte.split("\n").forEach((ligne, i) => {
    if (estElementDeListe(ligne)) {
      if (!liste) {
        liste = [];
        blocs.push({ type: "liste", cle: i, elements: liste });
      }
      liste.push(
        <li key={i} className="ml-5 list-disc my-1 text-foreground/85">
          {renderInline(ligne.slice(2), options)}
        </li>
      );
      return;
    }
    liste = null;

    const brut = ligne.trim();
    if (brut.startsWith("$$") && brut.endsWith("$$") && brut.length > 4) {
      blocs.push(<Formule key={i} source={brut.slice(2, -2)} bloc />);
    } else if (ligne.startsWith("###")) {
      blocs.push(
        <h4 key={i} className="font-display text-lg font-semibold text-foreground mt-4 mb-2">
          {renderInline(ligne.replace(/^###\s*/, ""), options)}
        </h4>
      );
    } else if (ligne.startsWith("##")) {
      blocs.push(
        <h3 key={i} className="font-display text-xl font-semibold text-foreground mt-5 mb-2">
          {renderInline(ligne.replace(/^##\s*/, ""), options)}
        </h3>
      );
    } else if (brut === "") {
      blocs.push(<div key={i} className="h-2" />);
    } else {
      blocs.push(
        <p key={i} className="my-1 text-foreground/85 leading-relaxed">
          {renderInline(ligne, options)}
        </p>
      );
    }
  });

  return blocs.map((bloc) =>
    bloc.type === "liste" ? (
      <ul key={`liste-${bloc.cle}`} className="my-1">
        {bloc.elements}
      </ul>
    ) : (
      bloc
    )
  );
};
