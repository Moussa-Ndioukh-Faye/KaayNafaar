import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { Fenetre, ControleSegmente } from "../ui/fenetre";
import { typeStudio, optionsParDefaut, LANGUES } from "./catalogue";

/** Options d'une production avant génération (format, durée, nombre…) + consignes libres */
export default function OptionsStudio({ type, initiales, fermer, generer, nbSources }) {
  const def = type ? typeStudio(type) : null;
  const [options, setOptions] = useState(() => (type ? { ...optionsParDefaut(type), ...initiales } : {}));

  useEffect(() => {
    if (type) setOptions({ ...optionsParDefaut(type), ...initiales });
  }, [type, initiales]);

  if (!def) return <Fenetre ouverte={false} fermer={fermer} titre="" />;
  const personnalise = type === "rapport" && options.format === "personnalise";
  const manque = personnalise && !options.consignes?.trim();

  return (
    <Fenetre
      ouverte={Boolean(type)}
      fermer={fermer}
      titre={def.nom}
      sousTitre={`Studio · ${nbSources} source${nbSources > 1 ? "s" : ""} utilisée${nbSources > 1 ? "s" : ""}`}
      idTitre="titre-options-studio"
      pied={
        <>
          <Button variant="ghost" onClick={fermer}>
            Annuler
          </Button>
          <Button onClick={() => generer(type, options)} disabled={manque}>
            <Sparkles aria-hidden="true" />
            Générer
          </Button>
        </>
      }
    >
      {def.options.map((opt) => (
        <div key={opt.cle} className="mb-5">
          <p className="etiquette mb-2">{opt.nom}</p>
          <ControleSegmente
            libelle={opt.nom}
            options={opt.choix}
            valeur={options[opt.cle]}
            changer={(v) => setOptions({ ...options, [opt.cle]: v })}
          />
        </div>
      ))}

      <p className="etiquette mb-2">Langue</p>
      <ControleSegmente libelle="Langue" options={LANGUES} valeur={options.langue} changer={(v) => setOptions({ ...options, langue: v })} />

      <label htmlFor="consignes-studio" className="etiquette block mt-5 mb-2">
        {personnalise ? "Décris le document voulu" : "Consignes (facultatif)"}
      </label>
      <textarea
        id="consignes-studio"
        rows={3}
        maxLength={600}
        aria-required={personnalise || undefined}
        className="input-field h-auto py-2.5"
        placeholder={def.exemple || "Ex. : insiste sur les exemples et les pièges d'examen."}
        value={options.consignes}
        onChange={(e) => setOptions({ ...options, consignes: e.target.value })}
      />
      {manque && <p className="mt-1 text-sm text-muted-foreground">Décris le rapport voulu pour pouvoir le générer.</p>}
    </Fenetre>
  );
}
