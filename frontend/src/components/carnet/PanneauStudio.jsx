import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Trash2, Copy, Share, FileInput, ChevronRight } from "lucide-react";
import { carnetsAPI } from "../../services/api";
import { Button } from "../ui/button";
import { Fenetre } from "../ui/fenetre";
import { formatMessage } from "../assistant/formatMessage";
import ProductionStudio from "./ProductionStudio";
import OptionsStudio from "./OptionsStudio";
import { TYPES_STUDIO, typeStudio } from "./catalogue";
import { cn } from "../../lib/utils";
import { messageErreur } from "@/lib/erreurs";

const dateCourte = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Résumé lisible des options d'une production (« Débat · Courte ») */
const resumeOptions = (p) => {
  const def = typeStudio(p.type);
  return def.options
    .map((opt) => opt.choix.find((c) => c.id === p.options?.[opt.cle])?.nom)
    .filter(Boolean)
    .join(" · ");
};

/**
 * Studio : génération (avec options), historique des productions, lecture,
 * export (flashcards → Mes fiches, quiz → Mes quiz), et notes du carnet.
 */
export default function PanneauStudio({ carnet, setCarnet, actives, onDemanderChat, onPassage, onErreur }) {
  const [typeOptions, setTypeOptions] = useState(null);
  const [initiales, setInitiales] = useState({});
  const [generation, setGeneration] = useState(null);
  const [ouverte, setOuverte] = useState(null);
  const [annonce, setAnnonce] = useState("");
  const [exporte, setExporte] = useState(null); // { vers: "fiche" | "quiz", message }
  const productions = carnet.productions || [];

  const ouvrirOptions = (type, depuis = {}) => {
    if (!actives.length) return onErreur("Coche au moins une source pour utiliser le studio.");
    setInitiales(depuis);
    setTypeOptions(type);
  };

  const generer = async (type, options) => {
    setTypeOptions(null);
    setGeneration(type);
    onErreur("");
    try {
      const { data } = await carnetsAPI.studio(carnet.id, type, options, actives);
      setCarnet((c) => ({ ...c, productions: [data.production, ...(c.productions || [])] }));
      setOuverte(data.production);
      setAnnonce(`${typeStudio(type).nom} prêt.`);
    } catch (err) {
      onErreur(messageErreur(err, "La génération a échoué. Réessaie."));
    } finally {
      setGeneration(null);
    }
  };

  const supprimer = async (p) => {
    try {
      await carnetsAPI.supprimerProduction(carnet.id, p.id);
      setCarnet((c) => ({ ...c, productions: c.productions.filter((x) => x.id !== p.id) }));
      setOuverte(null);
    } catch {
      onErreur("Impossible de supprimer cette production.");
    }
  };

  const exporter = async (p) => {
    try {
      const { data } = await carnetsAPI.exporterProduction(carnet.id, p.id);
      setExporte({ vers: data.vers, message: data.message });
      setOuverte(null);
    } catch (err) {
      onErreur(messageErreur(err, "L'export a échoué."));
    }
  };

  const questionAudio = (p) => async (question, position) => {
    const { data } = await carnetsAPI.intervention(carnet.id, p.id, question, position);
    return data.repliques;
  };

  const noteEnSource = async (n) => {
    try {
      const { data } = await carnetsAPI.noteEnSource(carnet.id, n.id);
      setCarnet(data.carnet);
      setAnnonce("La note est maintenant une source du carnet.");
    } catch (err) {
      onErreur(messageErreur(err, "Impossible de transformer la note en source."));
    }
  };

  const supprimerNote = async (noteId) => {
    try {
      await carnetsAPI.supprimerNote(carnet.id, noteId);
      setCarnet((c) => ({ ...c, notes: c.notes.filter((n) => n.id !== noteId) }));
    } catch {
      onErreur("Impossible de supprimer la note.");
    }
  };

  const defOuverte = ouverte && typeStudio(ouverte.type);

  return (
    <section aria-labelledby="titre-studio" className="space-y-6">
      <div>
        <h3 id="titre-studio" className="text-xl">
          Studio
        </h3>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {TYPES_STUDIO.map(({ type, nom, detail, icone: Icone, teinte }) => (
            <li key={type}>
              <button
                type="button"
                onClick={() => ouvrirOptions(type)}
                disabled={generation !== null}
                className="w-full h-full text-left rounded-xl bg-card shadow-sm px-3 py-3 transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className={cn("grid place-items-center w-8 h-8 rounded-[9px] text-white shrink-0", teinte)}>
                    {generation === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icone className="w-[18px] h-[18px]" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground text-sm leading-tight">{nom}</span>
                    <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
                      {generation === type ? "Préparation…" : detail}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="etiquette mb-2 px-1">Productions ({productions.length})</p>
        {generation && (
          <p role="status" className="mb-2 flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Préparation de « {typeStudio(generation).nom} »… cela peut prendre une minute.
          </p>
        )}
        {productions.length === 0 && !generation ? (
          <p className="text-sm text-muted-foreground px-1">Choisis un format ci-dessus : chaque version est gardée ici.</p>
        ) : (
          <ul className="rounded-2xl bg-card shadow-sm overflow-hidden">
            {productions.map((p, i) => {
              const def = typeStudio(p.type);
              const Icone = def.icone;
              const options = resumeOptions(p);
              return (
                <li key={p.id} className={i > 0 ? "border-t border-border" : ""}>
                  <button
                    type="button"
                    onClick={() => setOuverte(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.03] min-h-[56px]"
                  >
                    <span aria-hidden="true" className={cn("grid place-items-center w-8 h-8 rounded-[9px] text-white shrink-0", def.teinte)}>
                      <Icone className="w-[18px] h-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground leading-snug truncate">{p.titre || def.nom}</span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {def.nom}
                        {options && ` · ${options}`} · {dateCourte(p.createdAt)}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xl">
          Notes <span className="text-muted-foreground font-normal">({carnet.notes?.length || 0})</span>
        </h3>
        {!carnet.notes?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">Garde les meilleures réponses du chat ici avec « Garder en note ».</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {carnet.notes.map((n) => (
              <li key={n.id} className="rounded-2xl bg-card shadow-sm px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{n.titre}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 -mr-2 -mt-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer la note ${n.titre}`}
                    onClick={() => supprimerNote(n.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="text-sm mt-1 line-clamp-6">{formatMessage(n.contenu, { passages: n.citations, surCitation: onPassage })}</div>
                {n.sourceId ? (
                  <p className="mt-2 text-xs text-succes font-medium">Utilisée comme source</p>
                ) : (
                  <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => noteEnSource(n)}>
                    <FileInput aria-hidden="true" />
                    Utiliser comme source
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <OptionsStudio
        type={typeOptions}
        initiales={initiales}
        nbSources={actives.length}
        fermer={() => setTypeOptions(null)}
        generer={generer}
      />

      <Fenetre
        ouverte={Boolean(ouverte)}
        fermer={() => setOuverte(null)}
        titre={ouverte?.titre || defOuverte?.nom || ""}
        sousTitre={ouverte ? [defOuverte?.nom, resumeOptions(ouverte)].filter(Boolean).join(" · ") : ""}
        idTitre="titre-production"
        className="max-w-3xl"
        pied={
          ouverte && (
            <>
              <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={() => supprimer(ouverte)}>
                <Trash2 aria-hidden="true" />
                Supprimer
              </Button>
              {["flashcards", "quiz"].includes(ouverte.type) && (
                <Button variant="secondary" onClick={() => exporter(ouverte)}>
                  <Share aria-hidden="true" />
                  {ouverte.type === "quiz" ? "Ajouter à Mes quiz" : "Ajouter à Mes fiches"}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  const { coursIds: _ignore, ...opts } = ouverte.options || {};
                  setOuverte(null);
                  ouvrirOptions(ouverte.type, opts);
                }}
              >
                <Copy aria-hidden="true" />
                Nouvelle version
              </Button>
            </>
          )
        }
      >
        {ouverte && (
          <ProductionStudio
            type={ouverte.type}
            contenu={ouverte.contenu}
            options={ouverte.options}
            onNoeud={(notion, chemin) => {
              setOuverte(null);
              onDemanderChat(`Explique-moi « ${notion} »${chemin.length > 1 ? ` (dans le thème « ${chemin.at(-1)} »)` : ""} à partir de mes sources.`);
            }}
            onQuestionAudio={questionAudio(ouverte)}
          />
        )}
      </Fenetre>

      <p className="sr-only" role="status" aria-live="polite">
        {annonce}
      </p>
      {exporte && (
        <p role="status" className="rounded-xl bg-succes/15 px-4 py-3 text-sm text-foreground">
          {exporte.message}{" "}
          <Link to={exporte.vers === "quiz" ? "/quiz" : "/fiches"} className="font-semibold text-primary">
            Ouvrir
          </Link>
        </p>
      )}
    </section>
  );
}
