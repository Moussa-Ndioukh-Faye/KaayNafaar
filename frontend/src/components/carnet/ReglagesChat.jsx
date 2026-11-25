import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { carnetsAPI } from "../../services/api";
import { Button } from "../ui/button";
import { Fenetre, ControleSegmente } from "../ui/fenetre";
import { STYLES_CHAT, LONGUEURS_CHAT, LANGUES } from "./catalogue";
import { cn } from "../../lib/utils";

/** Réglages des réponses du chat de ce carnet : style, longueur, langue, consignes */
export default function ReglagesChat({ ouverte, fermer, carnet, onReglages }) {
  const [r, setR] = useState(carnet.reglages);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (ouverte) setR(carnet.reglages);
  }, [ouverte, carnet.reglages]);

  const enregistrer = async () => {
    setOccupe(true);
    setErreur("");
    try {
      const { data } = await carnetsAPI.reglages(carnet.id, r);
      onReglages(data.reglages);
      fermer();
    } catch (e) {
      setErreur(e.response?.data?.message || "Impossible d'enregistrer les réglages.");
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Fenetre
      ouverte={ouverte}
      fermer={fermer}
      titre="Réglages des réponses"
      sousTitre={carnet.titre}
      idTitre="titre-reglages"
      pied={
        <>
          <Button variant="ghost" onClick={fermer}>
            Annuler
          </Button>
          <Button onClick={enregistrer} disabled={occupe}>
            {occupe && <Loader2 className="animate-spin" aria-hidden="true" />}
            Enregistrer
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="etiquette mb-2">Style</legend>
        <div className="grid gap-2">
          {STYLES_CHAT.map((s) => (
            <label
              key={s.id}
              htmlFor={`style-${s.id}`}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer",
                r.style === s.id ? "border-primary bg-secondary" : "border-border"
              )}
            >
              <input
                id={`style-${s.id}`}
                type="radio"
                name="style"
                className="mt-1 w-4 h-4 accent-primary"
                checked={r.style === s.id}
                onChange={() => setR({ ...r, style: s.id })}
              />
              <span>
                <span className="block font-semibold text-foreground">{s.nom}</span>
                <span className="block text-sm text-muted-foreground">{s.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="etiquette mt-5 mb-2" id="libelle-longueur">
        Longueur
      </p>
      <ControleSegmente libelle="Longueur des réponses" options={LONGUEURS_CHAT} valeur={r.longueur} changer={(v) => setR({ ...r, longueur: v })} />

      <p className="etiquette mt-5 mb-2">Langue</p>
      <ControleSegmente libelle="Langue des réponses" options={LANGUES} valeur={r.langue} changer={(v) => setR({ ...r, langue: v })} />

      <label htmlFor="consignes-chat" className="etiquette block mt-5 mb-2">
        Consignes personnelles (facultatif)
      </label>
      <textarea
        id="consignes-chat"
        rows={3}
        maxLength={600}
        className="input-field h-auto py-2.5"
        placeholder="Ex. : donne des exemples tirés de la vie au Sénégal ; tutoie-moi."
        value={r.consignes}
        onChange={(e) => setR({ ...r, consignes: e.target.value })}
      />
      <p className="mt-1 text-right text-xs text-muted-foreground chiffres">{r.consignes.length} / 600</p>

      {erreur && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {erreur}
        </p>
      )}
    </Fenetre>
  );
}
