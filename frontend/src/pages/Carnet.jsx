import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Square,
  Link2,
  Loader2,
  BookmarkPlus,
  Trash2,
  X,
  FileText,
  Network,
  CalendarRange,
  HelpCircle,
  BookA,
  Headphones,
  RotateCcw,
  Upload,
} from "lucide-react";
import { carnetsAPI, coursAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { formatMessage } from "../components/assistant/formatMessage";
import ProductionStudio from "../components/carnet/ProductionStudio";
import { cn } from "../lib/utils";

const STUDIO = [
  { type: "synthese", nom: "Note de synthèse", detail: "L'essentiel, structuré", icone: FileText },
  { type: "carte_mentale", nom: "Carte mentale", detail: "Les notions et leurs liens", icone: Network },
  { type: "frise", nom: "Frise et étapes", detail: "Dates ou grandes étapes", icone: CalendarRange },
  { type: "faq", nom: "Questions d'examen", detail: "Questions probables et réponses", icone: HelpCircle },
  { type: "glossaire", nom: "Glossaire", detail: "Les termes à connaître", icone: BookA },
  { type: "podcast", nom: "Résumé audio", detail: "Awa et Moussa en discutent", icone: Headphones },
];

const ONGLETS = [
  { id: "sources", nom: "Sources" },
  { id: "chat", nom: "Questions" },
  { id: "studio", nom: "Studio" },
];

/** Fenêtre native <dialog> qui affiche le passage cité par l'IA */
function FenetrePassage({ passage, fermer }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (passage && d && !d.open) d.showModal?.();
    if (!passage && d?.open) d.close?.();
  }, [passage]);
  return (
    <dialog
      ref={ref}
      onClose={fermer}
      aria-labelledby="titre-passage"
      className="w-[calc(100%-2rem)] max-w-xl bg-card text-card-foreground border border-border rounded-lg shadow-xl p-0 backdrop:bg-encre/50"
    >
      {passage && (
        <div>
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b-2 border-marge/60">
            <div>
              <p className="etiquette">Source [{passage.n}]</p>
              <h2 id="titre-passage" className="text-xl">
                {passage.titre}
              </h2>
            </div>
            <form method="dialog">
              <button type="submit" aria-label="Fermer" className="w-9 h-9 grid place-items-center rounded-md hover:bg-foreground/[0.06]">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </form>
          </div>
          <blockquote className="px-6 py-5 max-h-[60vh] overflow-y-auto whitespace-pre-wrap leading-7 text-foreground/90">{passage.texte}</blockquote>
        </div>
      )}
    </dialog>
  );
}

export default function Carnet() {
  const { id } = useParams();
  const [carnet, setCarnet] = useState(null);
  const [tousLesCours, setTousLesCours] = useState([]);
  const [erreur, setErreur] = useState("");
  const [onglet, setOnglet] = useState("chat"); // téléphone : un panneau à la fois
  const [panneauDroit, setPanneauDroit] = useState("studio"); // ordinateur portable : colonne de droite

  // Chat
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [passageOuvert, setPassageOuvert] = useState(null);
  const controleur = useRef(null);
  const finChat = useRef(null);

  // Studio
  const [typeAffiche, setTypeAffiche] = useState(null);
  const [generation, setGeneration] = useState(null);

  // Sources
  const [lien, setLien] = useState("");
  const [importLien, setImportLien] = useState(false);

  useEffect(() => {
    Promise.all([carnetsAPI.obtenir(id), coursAPI.getCours()])
      .then(([c, co]) => {
        setCarnet(c.data.carnet);
        setTousLesCours(co.data.cours || []);
        const premiers = Object.keys(c.data.carnet.studio || {});
        if (premiers.length) setTypeAffiche(premiers[0]);
      })
      .catch((e) => setErreur(e.response?.status === 404 ? "Ce carnet n'existe pas." : "Impossible de charger le carnet."));
    return () => controleur.current?.abort?.();
  }, [id]);

  useEffect(() => {
    finChat.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (erreur && !carnet) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p role="alert" className="font-display text-2xl text-foreground">
          {erreur}
        </p>
        <Link to="/carnets" className="mt-4 inline-block text-primary underline underline-offset-4">
          Retour à mes carnets
        </Link>
      </div>
    );
  }
  if (!carnet) {
    return (
      <p role="status" className="text-muted-foreground">
        Chargement du carnet…
      </p>
    );
  }

  const sourcesIds = carnet.coursIds || [];

  /* ── Sources ── */
  const enregistrerSources = async (ids) => {
    try {
      const { data } = await carnetsAPI.modifier(carnet.id, { coursIds: ids });
      setCarnet(data.carnet);
    } catch {
      setErreur("Impossible de mettre à jour les sources.");
    }
  };
  const basculerSource = (coursId) =>
    enregistrerSources(sourcesIds.includes(coursId) ? sourcesIds.filter((x) => x !== coursId) : [...sourcesIds, coursId]);

  const ajouterLien = async (e) => {
    e.preventDefault();
    if (!lien.trim()) return;
    setImportLien(true);
    setErreur("");
    try {
      const { data } = await coursAPI.importerLien(lien.trim());
      setTousLesCours((l) => [data.cours, ...l]);
      await enregistrerSources([...sourcesIds, data.cours.id]);
      setLien("");
    } catch (err) {
      setErreur(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Impossible d'importer cette page.");
    } finally {
      setImportLien(false);
    }
  };

  /* ── Chat ── */
  const envoyer = (e) => {
    e?.preventDefault();
    const texte = question.trim();
    if (!texte || enCours) return;
    if (!sourcesIds.length) return setErreur("Ajoute au moins une source à ce carnet avant de poser une question.");
    setErreur("");
    setQuestion("");
    const historique = [...messages, { role: "user", content: texte }];
    setMessages([...historique, { role: "assistant", content: "", passages: [] }]);
    setEnCours(true);

    const majReponse = (changement) =>
      setMessages((l) => {
        const copie = [...l];
        copie[copie.length - 1] = { ...copie[copie.length - 1], ...changement(copie[copie.length - 1]) };
        return copie;
      });

    controleur.current = carnetsAPI.chatStream(
      carnet.id,
      historique.map(({ role, content }) => ({ role, content })),
      {
        onPassages: (passages) => majReponse(() => ({ passages })),
        onDelta: (delta) => majReponse((m) => ({ content: m.content + delta })),
        onDone: () => setEnCours(false),
        onError: (msg) => {
          setEnCours(false);
          setErreur(msg || "Erreur pendant la réponse.");
        },
      }
    );
  };

  const arreter = () => {
    controleur.current?.abort?.();
    setEnCours(false);
  };

  const enregistrerNote = async (m) => {
    try {
      const { data } = await carnetsAPI.ajouterNote(carnet.id, { contenu: m.content, citations: m.passages });
      setCarnet((c) => ({ ...c, notes: [data.note, ...(c.notes || [])] }));
    } catch {
      setErreur("Impossible d'enregistrer la note.");
    }
  };

  const supprimerNote = async (noteId) => {
    try {
      await carnetsAPI.supprimerNote(carnet.id, noteId);
      setCarnet((c) => ({ ...c, notes: c.notes.filter((n) => n.id !== noteId) }));
    } catch {
      setErreur("Impossible de supprimer la note.");
    }
  };

  /* ── Studio ── */
  const generer = async (type) => {
    if (!sourcesIds.length) return setErreur("Ajoute au moins une source à ce carnet.");
    setGeneration(type);
    setErreur("");
    try {
      const { data } = await carnetsAPI.studio(carnet.id, type);
      setCarnet((c) => ({ ...c, studio: { ...(c.studio || {}), [type]: data.production } }));
      setTypeAffiche(type);
    } catch (err) {
      setErreur(err.response?.data?.message || "La génération a échoué. Réessaie.");
    } finally {
      setGeneration(null);
    }
  };

  const productionAffichee = typeAffiche && carnet.studio?.[typeAffiche];

  // Ordinateur portable (lg à 2xl) : la colonne de droite bascule entre Sources et Studio
  const selecteurDroit = (
    <div role="group" aria-label="Colonne de droite" className="hidden lg:grid 2xl:hidden grid-cols-2 mb-4 rounded-md border border-input bg-card p-1">
      {[
        { id: "sources", nom: `Sources (${sourcesIds.length})` },
        { id: "studio", nom: "Studio et notes" },
      ].map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={panneauDroit === o.id}
          onClick={() => setPanneauDroit(o.id)}
          className={cn(
            "h-9 rounded-[4px] text-sm font-semibold",
            panneauDroit === o.id ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-foreground/[0.06]"
          )}
        >
          {o.nom}
        </button>
      ))}
    </div>
  );

  const panneauSources = (
    <section aria-labelledby="titre-sources" className="space-y-4">
      <h3 id="titre-sources" className="text-xl">
        Sources <span className="text-muted-foreground font-normal">({sourcesIds.length})</span>
      </h3>
      {tousLesCours.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun cours importé pour l'instant.</p>
      ) : (
        <ul className="border-t border-border">
          {tousLesCours.map((c) => (
            <li key={c.id} className="border-b border-border">
              <label htmlFor={`source-${c.id}`} className="flex items-start gap-3 py-2.5 cursor-pointer">
                <input
                  id={`source-${c.id}`}
                  type="checkbox"
                  className="mt-0.5 w-5 h-5 accent-primary shrink-0"
                  checked={sourcesIds.includes(c.id)}
                  onChange={() => basculerSource(c.id)}
                />
                <span className="min-w-0">
                  <span className="block text-foreground leading-snug">{c.titre}</span>
                  <span className="block text-xs text-muted-foreground">{c.matiere}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={ajouterLien} className="space-y-2">
        <label htmlFor="lien-source" className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Link2 className="w-4 h-4" aria-hidden="true" />
          Ajouter une page web
        </label>
        <div className="flex gap-2">
          <input
            id="lien-source"
            type="url"
            inputMode="url"
            className="input-field h-10 py-0"
            placeholder="https://…"
            value={lien}
            onChange={(e) => setLien(e.target.value)}
          />
          <Button type="submit" size="sm" className="h-10" disabled={importLien || !lien.trim()} aria-label="Importer la page">
            {importLien ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Ajouter"}
          </Button>
        </div>
      </form>
      <Link to="/mes-cours" className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4">
        <Upload className="w-4 h-4" aria-hidden="true" />
        Importer un PDF, Word, PowerPoint ou une photo
      </Link>
    </section>
  );

  const panneauChat = (
    <section aria-labelledby="titre-chat" className="flex flex-col min-h-[28rem] lg:h-[calc(100vh-15rem)]">
      <h3 id="titre-chat" className="sr-only">
        Questions au carnet
      </h3>
      <div className="flex-1 overflow-y-auto space-y-5 pr-1" role="log" aria-live="polite" aria-label="Conversation avec le carnet">
        {messages.length === 0 && (
          <div className="py-6">
            <p className="font-display text-2xl text-foreground">
              Interroge tes <span className="surligne">sources</span>.
            </p>
            <p className="mt-2 text-muted-foreground">
              Chaque réponse s'appuie uniquement sur les cours de ce carnet et cite ses passages : touche un numéro pour lire l'extrait.
            </p>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] bg-surligneur-pale text-encre border border-encre/15 rounded-sm shadow-md px-4 py-3 rotate-[0.3deg]">
              <span className="sr-only">Toi : </span>
              {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-[95%] bg-card border border-border rounded-md shadow-md px-5 py-4">
              <span className="sr-only">Carnet : </span>
              {m.content ? (
                formatMessage(m.content, { passages: m.passages, surCitation: setPassageOuvert })
              ) : (
                <p role="status" className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Lecture des sources…
                </p>
              )}
              {m.content && !(enCours && i === messages.length - 1) && (
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                  {m.passages?.length > 0 && (
                    <span className="text-xs text-muted-foreground mr-auto">
                      {m.passages.length} passage{m.passages.length > 1 ? "s" : ""} de {new Set(m.passages.map((p) => p.titre)).size} source
                      {new Set(m.passages.map((p) => p.titre)).size > 1 ? "s" : ""}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => enregistrerNote(m)}>
                    <BookmarkPlus aria-hidden="true" />
                    Garder en note
                  </Button>
                </div>
              )}
            </div>
          )
        )}
        <div ref={finChat} />
      </div>
      <form onSubmit={envoyer} className="mt-4 flex items-end gap-2 bg-card border border-border rounded-md shadow-md p-2">
        <label htmlFor="question-carnet" className="sr-only">
          Ta question
        </label>
        <textarea
          id="question-carnet"
          rows={1}
          maxLength={5000}
          className="flex-1 resize-none bg-transparent px-3 py-2.5 outline-none max-h-40 text-foreground placeholder:text-muted-foreground"
          placeholder={sourcesIds.length ? "Pose une question sur tes sources…" : "Ajoute d'abord une source"}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) envoyer(e);
          }}
        />
        {enCours ? (
          <Button type="button" variant="destructive" size="icon" aria-label="Arrêter la réponse" onClick={arreter}>
            <Square aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" size="icon" aria-label="Envoyer la question" disabled={!question.trim()}>
            <Send aria-hidden="true" />
          </Button>
        )}
      </form>
    </section>
  );

  const panneauStudio = (
    <section aria-labelledby="titre-studio" className="space-y-6">
      <div>
        <h3 id="titre-studio" className="text-xl">
          Studio
        </h3>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {STUDIO.map(({ type, nom, detail, icone: Icone }) => {
            const existe = Boolean(carnet.studio?.[type]);
            return (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => (existe ? setTypeAffiche(type) : generer(type))}
                  disabled={generation !== null}
                  aria-pressed={typeAffiche === type}
                  className={cn(
                    "w-full h-full text-left rounded-md border px-3 py-2.5 transition-colors disabled:opacity-60",
                    typeAffiche === type ? "border-encre/80 dark:border-foreground/60 bg-secondary/40" : "border-border bg-card hover:bg-secondary/20"
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold text-foreground text-sm">
                    {generation === type ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Icone className="w-4 h-4 text-primary" aria-hidden="true" />
                    )}
                    {nom}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {generation === type ? "Préparation…" : existe ? "Prêt · ouvrir" : detail}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {productionAffichee && (
        <div className="bg-card border border-border rounded-md shadow-md p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="etiquette">{STUDIO.find((s) => s.type === typeAffiche)?.nom}</p>
            <Button variant="ghost" size="sm" onClick={() => generer(typeAffiche)} disabled={generation !== null}>
              <RotateCcw aria-hidden="true" />
              Régénérer
            </Button>
          </div>
          <ProductionStudio type={typeAffiche} contenu={productionAffichee.contenu} />
        </div>
      )}

      <div>
        <h3 className="text-xl">
          Notes <span className="text-muted-foreground font-normal">({carnet.notes?.length || 0})</span>
        </h3>
        {!carnet.notes?.length ? (
          <p className="mt-2 text-sm text-muted-foreground">Garde les meilleures réponses du chat ici avec « Garder en note ».</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {carnet.notes.map((n) => (
              <li key={n.id} className="bg-surligneur-pale/70 dark:bg-card text-foreground border border-encre/15 dark:border-border rounded-sm px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{n.titre}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 -mr-2 -mt-1 text-muted-foreground hover:text-marge"
                    aria-label={`Supprimer la note ${n.titre}`}
                    onClick={() => supprimerNote(n.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="text-sm mt-1 line-clamp-6">{formatMessage(n.contenu, { passages: n.citations, surCitation: setPassageOuvert })}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );

  return (
    <div className="max-w-[90rem] mx-auto pb-10">
      <Link to="/carnets" className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Mes carnets
      </Link>
      <h2 className="mt-2 text-3xl md:text-4xl text-foreground">{carnet.titre}</h2>
      {carnet.description && <p className="annotation mt-1">{carnet.description}</p>}

      {erreur && (
        <p role="alert" className="mt-4 rounded-md border border-marge/40 bg-marge/10 px-4 py-3 text-sm text-marge">
          {erreur}
        </p>
      )}

      {/* Mobile et tablette : un panneau à la fois */}
      <div role="group" aria-label="Panneau affiché" className="lg:hidden mt-5 grid grid-cols-3 rounded-md border border-input bg-card p-1">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={cn(
              "h-10 rounded-[4px] text-sm font-semibold",
              onglet === o.id ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-foreground/[0.06]"
            )}
          >
            {o.nom}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] 2xl:grid-cols-[16rem_minmax(0,1fr)_minmax(0,26rem)]">
        <div
          className={cn(
            onglet !== "sources" && "hidden",
            panneauDroit === "sources" ? "lg:block lg:col-start-2 lg:row-start-1" : "lg:hidden",
            "2xl:block 2xl:col-start-1 2xl:row-start-1"
          )}
        >
          {selecteurDroit}
          {panneauSources}
        </div>
        <div className={cn(onglet !== "chat" && "hidden", "lg:block lg:col-start-1 lg:row-start-1 2xl:col-start-2")}>{panneauChat}</div>
        <div
          className={cn(
            onglet !== "studio" && "hidden",
            panneauDroit === "studio" ? "lg:block lg:col-start-2 lg:row-start-1" : "lg:hidden",
            "2xl:block 2xl:col-start-3 2xl:row-start-1"
          )}
        >
          {selecteurDroit}
          {panneauStudio}
        </div>
      </div>

      <FenetrePassage passage={passageOuvert} fermer={() => setPassageOuvert(null)} />
    </div>
  );
}
