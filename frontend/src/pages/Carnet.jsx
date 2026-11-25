import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { carnetsAPI, coursAPI } from "../services/api";
import { Fenetre, ControleSegmente } from "../components/ui/fenetre";
import GuideCarnet from "../components/carnet/GuideCarnet";
import PanneauSources from "../components/carnet/PanneauSources";
import AjoutSources from "../components/carnet/AjoutSources";
import PanneauChat from "../components/carnet/PanneauChat";
import ReglagesChat from "../components/carnet/ReglagesChat";
import PanneauStudio from "../components/carnet/PanneauStudio";
import { cn } from "../lib/utils";

const ONGLETS = [
  { id: "sources", nom: "Sources" },
  { id: "chat", nom: "Questions" },
  { id: "studio", nom: "Studio" },
];

/** Passage cité par une réponse : source, page, section et texte exact */
function FenetrePassage({ passage, fermer }) {
  const ou = passage ? [passage.page, passage.section].filter(Boolean).join(" · ") : "";
  return (
    <Fenetre
      ouverte={Boolean(passage)}
      fermer={fermer}
      titre={passage?.titre || ""}
      sousTitre={passage ? `Source [${passage.n}]${ou ? ` · ${ou}` : ""}` : ""}
      idTitre="titre-passage"
    >
      {passage && <blockquote className="whitespace-pre-wrap leading-7 text-foreground/90">{passage.texte}</blockquote>}
    </Fenetre>
  );
}

/**
 * Espace de travail d'un carnet : Sources | Questions (guide + chat) | Studio.
 * Téléphone : un panneau à la fois ; portable : chat + colonne au choix ; grand écran : trois colonnes.
 */
export default function Carnet() {
  const { id } = useParams();
  const [carnet, setCarnet] = useState(null);
  const [tousLesCours, setTousLesCours] = useState([]);
  const [erreur, setErreur] = useState("");
  const [onglet, setOnglet] = useState("chat");
  const [panneauDroit, setPanneauDroit] = useState("studio");
  const [actives, setActives] = useState([]);
  const [guideSources, setGuideSources] = useState([]);
  const [demande, setDemande] = useState(null);
  const [passageOuvert, setPassageOuvert] = useState(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const sourcesConnues = useRef([]);

  useEffect(() => {
    Promise.all([carnetsAPI.obtenir(id), coursAPI.getCours()])
      .then(([c, co]) => {
        setCarnet(c.data.carnet);
        setTousLesCours(co.data.cours || []);
      })
      .catch((e) => setErreur(e.response?.status === 404 ? "Ce carnet n'existe pas." : "Impossible de charger le carnet."));
  }, [id]);

  // Sources actives : toutes par défaut ; une source ajoutée est active, une source retirée disparaît
  useEffect(() => {
    if (!carnet) return;
    const ids = carnet.coursIds || [];
    setActives((a) => {
      const nouvelles = ids.filter((x) => !sourcesConnues.current.includes(x));
      sourcesConnues.current = ids;
      return [...a.filter((x) => ids.includes(x)), ...nouvelles];
    });
  }, [carnet]);

  const surGuide = useCallback((g) => setGuideSources(g.sources || []), []);
  const demanderChat = useCallback((texte) => {
    setDemande({ texte, cle: `${Date.now()}` });
    setOnglet("chat");
  }, []);
  const cleGuide = useMemo(() => (carnet?.coursIds || []).join(","), [carnet?.coursIds]);

  if (erreur && !carnet) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p role="alert" className="text-2xl font-bold text-foreground">
          {erreur}
        </p>
        <Link to="/carnets" className="mt-4 inline-block text-primary">
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

  const retirerSource = async (coursId) => {
    try {
      const { data } = await carnetsAPI.modifier(carnet.id, { coursIds: carnet.coursIds.filter((x) => x !== coursId) });
      setCarnet(data.carnet);
    } catch {
      setErreur("Impossible de retirer cette source.");
    }
  };

  const enregistrerNote = async (m) => {
    try {
      const { data } = await carnetsAPI.ajouterNote(carnet.id, { contenu: m.content, citations: m.passages });
      setCarnet((c) => ({ ...c, notes: [data.note, ...(c.notes || [])] }));
    } catch {
      setErreur("Impossible d'enregistrer la note.");
    }
  };

  // Portable (lg à 2xl) : la colonne de droite bascule entre Sources et Studio
  const selecteurDroit = (
    <ControleSegmente
      libelle="Colonne de droite"
      className="hidden lg:flex 2xl:hidden mb-4"
      options={[
        { id: "sources", nom: `Sources (${carnet.coursIds?.length || 0})` },
        { id: "studio", nom: "Studio et notes" },
      ]}
      valeur={panneauDroit}
      changer={setPanneauDroit}
    />
  );

  return (
    <div className="max-w-[90rem] mx-auto pb-10">
      <Link to="/carnets" className="inline-flex items-center gap-2 text-sm text-primary">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Mes carnets
      </Link>
      <h2 className="mt-2 text-3xl md:text-4xl text-foreground">{carnet.titre}</h2>
      {carnet.description && <p className="mt-1 text-muted-foreground">{carnet.description}</p>}

      {erreur && (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erreur}
        </p>
      )}

      <ControleSegmente libelle="Panneau affiché" className="lg:hidden mt-5" options={ONGLETS} valeur={onglet} changer={setOnglet} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] 2xl:grid-cols-[18rem_minmax(0,1fr)_minmax(0,26rem)]">
        <div
          className={cn(
            onglet !== "sources" && "hidden",
            panneauDroit === "sources" ? "lg:block lg:col-start-2 lg:row-start-1" : "lg:hidden",
            "2xl:block 2xl:col-start-1 2xl:row-start-1"
          )}
        >
          {selecteurDroit}
          <PanneauSources
            carnet={carnet}
            guideSources={guideSources}
            actives={actives}
            changerActives={setActives}
            retirer={retirerSource}
            ouvrirAjout={() => setAjoutOuvert(true)}
          />
        </div>

        <div className={cn(onglet !== "chat" && "hidden", "lg:block lg:col-start-1 lg:row-start-1 2xl:col-start-2")}>
          <PanneauChat
            carnet={carnet}
            actives={actives}
            demande={demande}
            onPassage={setPassageOuvert}
            onNote={enregistrerNote}
            onErreur={setErreur}
            ouvrirReglages={() => setReglagesOuverts(true)}
            entete={carnet.coursIds?.length > 0 && <GuideCarnet carnetId={carnet.id} cle={cleGuide} onQuestion={demanderChat} onGuide={surGuide} />}
          />
        </div>

        <div
          className={cn(
            onglet !== "studio" && "hidden",
            panneauDroit === "studio" ? "lg:block lg:col-start-2 lg:row-start-1" : "lg:hidden",
            "2xl:block 2xl:col-start-3 2xl:row-start-1"
          )}
        >
          {selecteurDroit}
          <PanneauStudio
            carnet={carnet}
            setCarnet={setCarnet}
            actives={actives}
            onDemanderChat={demanderChat}
            onPassage={setPassageOuvert}
            onErreur={setErreur}
          />
        </div>
      </div>

      <AjoutSources
        ouverte={ajoutOuvert}
        fermer={() => setAjoutOuvert(false)}
        carnet={carnet}
        tousLesCours={tousLesCours}
        onCarnet={setCarnet}
        onCoursCree={(c) => setTousLesCours((l) => [c, ...l])}
      />
      <ReglagesChat
        ouverte={reglagesOuverts}
        fermer={() => setReglagesOuverts(false)}
        carnet={carnet}
        onReglages={(reglages) => setCarnet((c) => ({ ...c, reglages }))}
      />
      <FenetrePassage passage={passageOuvert} fermer={() => setPassageOuvert(null)} />
    </div>
  );
}
