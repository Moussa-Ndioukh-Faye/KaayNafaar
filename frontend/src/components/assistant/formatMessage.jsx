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

const estElementDeListe = (ligne) => ligne.startsWith("- ") || ligne.startsWith("• ") || ligne.startsWith("* ");
const NUMERO = /^(\d{1,2})[.)]\s+/;
const estLigneTableau = (ligne) => /^\s*\|.*\|\s*$/.test(ligne);
const estSeparateurTableau = (ligne) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(ligne);
const cellules = (ligne) =>
  ligne
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

/** Tableau Markdown → vrai <table> (en-tête si la 2e ligne est un séparateur) */
function Tableau({ lignes, options }) {
  const avecEntete = lignes.length > 1 && estSeparateurTableau(lignes[1]);
  const entete = avecEntete ? cellules(lignes[0]) : null;
  const corps = (avecEntete ? lignes.slice(2) : lignes).filter((l) => !estSeparateurTableau(l)).map(cellules);
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm border-collapse">
        {entete && (
          <thead className="bg-muted">
            <tr>
              {entete.map((c, i) => (
                <th key={i} scope="col" className="text-left font-semibold px-3 py-2 border-b border-border">
                  {renderInline(c, options)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {corps.map((ligne, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {ligne.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top text-foreground/85">
                  {renderInline(c, options)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const formatMessage = (texte, options = {}) => {
  if (!texte) return null;

  const blocs = [];
  let liste = null; // éléments <li> consécutifs, regroupés dans un vrai <ul> ou <ol>
  let tableau = null;

  texte.split("\n").forEach((ligne, i) => {
    if (estLigneTableau(ligne)) {
      liste = null;
      if (!tableau) {
        tableau = [];
        blocs.push({ type: "tableau", cle: i, lignes: tableau });
      }
      tableau.push(ligne);
      return;
    }
    tableau = null;

    const numero = ligne.match(NUMERO);
    if (estElementDeListe(ligne) || numero) {
      const ordonnee = Boolean(numero);
      if (!liste || liste.ordonnee !== ordonnee) {
        liste = { ordonnee, elements: [] };
        blocs.push({ type: "liste", cle: i, liste });
      }
      liste.elements.push(
        <li key={i} className={`ml-5 my-1 text-foreground/85 ${ordonnee ? "list-decimal" : "list-disc"}`}>
          {renderInline(ordonnee ? ligne.replace(NUMERO, "") : ligne.slice(2), options)}
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
        <h4 key={i} className="text-lg font-semibold text-foreground mt-4 mb-2">
          {renderInline(ligne.replace(/^###\s*/, ""), options)}
        </h4>
      );
    } else if (/^#{1,2}\s/.test(ligne)) {
      blocs.push(
        <h3 key={i} className="text-xl font-bold text-foreground mt-5 mb-2">
          {renderInline(ligne.replace(/^#{1,2}\s*/, ""), options)}
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

  return blocs.map((bloc) => {
    if (bloc.type === "tableau") return <Tableau key={`tableau-${bloc.cle}`} lignes={bloc.lignes} options={options} />;
    if (bloc.type === "liste") {
      const Balise = bloc.liste.ordonnee ? "ol" : "ul";
      return (
        <Balise key={`liste-${bloc.cle}`} className="my-1">
          {bloc.liste.elements}
        </Balise>
      );
    }
    return bloc;
  });
};
