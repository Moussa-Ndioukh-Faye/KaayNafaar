/**
 * Mise en forme légère des réponses de l'IA (sous-ensemble de Markdown) :
 * titres ## et ###, listes « - » ou « • », gras **texte**.
 * Aucun HTML n'est interprété : le texte de l'IA ne peut pas injecter de balises (XSS).
 */

/** Gras (**texte**) à l'intérieur d'une ligne */
export const renderInline = (text) => {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const estElementDeListe = (ligne) => ligne.startsWith("- ") || ligne.startsWith("• ");

export const formatMessage = (texte) => {
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
        <li key={i} className="ml-5 list-disc my-1 text-gray-700 dark:text-gray-300">
          {renderInline(ligne.slice(2))}
        </li>
      );
      return;
    }
    liste = null;

    if (ligne.startsWith("###")) {
      blocs.push(
        <h4 key={i} className="font-bold text-gray-900 dark:text-white mt-4 mb-2">
          {renderInline(ligne.replace(/^###\s*/, ""))}
        </h4>
      );
    } else if (ligne.startsWith("##")) {
      blocs.push(
        <h3 key={i} className="text-lg font-extrabold text-gray-900 dark:text-white mt-5 mb-3">
          {renderInline(ligne.replace(/^##\s*/, ""))}
        </h3>
      );
    } else if (ligne.trim() === "") {
      blocs.push(<div key={i} className="h-2" />);
    } else {
      blocs.push(
        <p key={i} className="my-1 text-gray-700 dark:text-gray-300 leading-relaxed">
          {renderInline(ligne)}
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
