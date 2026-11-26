import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Upload, ExternalLink } from "lucide-react";
import { carnetsAPI, coursAPI } from "../../services/api";
import { Button } from "../ui/button";
import { Fenetre, ControleSegmente } from "../ui/fenetre";
import { messageErreur } from "@/lib/erreurs";

const ONGLETS = [
  { id: "cours", nom: "Mes cours" },
  { id: "lien", nom: "Page web" },
  { id: "web", nom: "Rechercher" },
];

/**
 * Ajout de sources au carnet : parmi mes cours, par lien, ou par recherche sur le web
 * (l'étudiant choisit les pages ; l'import est fait par le serveur, protégé contre le SSRF).
 */
export default function AjoutSources({ ouverte, fermer, carnet, tousLesCours, onCarnet, onCoursCree }) {
  const [onglet, setOnglet] = useState("cours");
  const [choix, setChoix] = useState([]);
  const [lien, setLien] = useState("");
  const [sujet, setSujet] = useState("");
  const [resultats, setResultats] = useState(null);
  const [selection, setSelection] = useState([]);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState({ type: "", texte: "" });

  const dejaLa = new Set(carnet.coursIds || []);
  const disponibles = tousLesCours.filter((c) => !dejaLa.has(c.id));

  const executer = async (action) => {
    setOccupe(true);
    setMessage({ type: "", texte: "" });
    try {
      await action();
    } catch (err) {
      setMessage({ type: "erreur", texte: messageErreur(err, "Échec. Réessaie.") });
    } finally {
      setOccupe(false);
    }
  };

  const ajouterCours = () =>
    executer(async () => {
      const { data } = await carnetsAPI.modifier(carnet.id, { coursIds: [...(carnet.coursIds || []), ...choix] });
      onCarnet(data.carnet);
      setChoix([]);
      fermer();
    });

  const ajouterLien = (e) => {
    e.preventDefault();
    if (!lien.trim()) return;
    executer(async () => {
      const { data } = await coursAPI.importerLien(lien.trim());
      onCoursCree(data.cours);
      const maj = await carnetsAPI.modifier(carnet.id, { coursIds: [...(carnet.coursIds || []), data.cours.id] });
      onCarnet(maj.data.carnet);
      setLien("");
      setMessage({ type: "succes", texte: "Page ajoutée au carnet." });
    });
  };

  const rechercher = (e) => {
    e.preventDefault();
    if (sujet.trim().length < 3) return setMessage({ type: "erreur", texte: "Décris le sujet en quelques mots." });
    executer(async () => {
      const { data } = await carnetsAPI.decouvrir(carnet.id, sujet.trim());
      setResultats(data.resultats);
      setSelection([]);
      if (!data.resultats.length) setMessage({ type: "erreur", texte: "Aucune page trouvée. Essaie d'autres mots." });
    });
  };

  const importerSelection = () =>
    executer(async () => {
      const { data } = await carnetsAPI.ajouterSourcesWeb(carnet.id, selection);
      onCarnet(data.carnet);
      setResultats((r) => r.filter((x) => !selection.includes(x.url) || data.echecs.some((f) => f.url === x.url)));
      setSelection([]);
      setMessage({
        type: data.echecs?.length ? "erreur" : "succes",
        texte: data.echecs?.length ? `${data.message} ${data.echecs.length} page(s) refusée(s).` : data.message,
      });
    });

  const basculer = (liste, setListe, valeur) =>
    setListe(liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur]);

  return (
    <Fenetre ouverte={ouverte} fermer={fermer} titre="Ajouter des sources" sousTitre={carnet.titre} idTitre="titre-ajout-sources">
      <ControleSegmente libelle="Type de source" options={ONGLETS} valeur={onglet} changer={(o) => { setOnglet(o); setMessage({ type: "", texte: "" }); }} />

      <div className="mt-5">
        {onglet === "cours" && (
          <>
            {disponibles.length === 0 ? (
              <p className="text-muted-foreground">Tous tes cours sont déjà dans ce carnet.</p>
            ) : (
              <ul className="rounded-2xl border border-border overflow-hidden max-h-[45vh] overflow-y-auto">
                {disponibles.map((c, i) => (
                  <li key={c.id} className={i > 0 ? "border-t border-border" : ""}>
                    <label htmlFor={`ajout-${c.id}`} className="flex items-center gap-3 px-4 py-3 cursor-pointer min-h-[48px]">
                      <input
                        id={`ajout-${c.id}`}
                        type="checkbox"
                        className="w-5 h-5 accent-primary shrink-0"
                        checked={choix.includes(c.id)}
                        onChange={() => basculer(choix, setChoix, c.id)}
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link to="/mes-cours" className="inline-flex items-center gap-2 text-sm text-primary">
                <Upload className="w-4 h-4" aria-hidden="true" />
                Importer un fichier (PDF, Word, PowerPoint, photo)
              </Link>
              <Button onClick={ajouterCours} disabled={!choix.length || occupe}>
                {occupe && <Loader2 className="animate-spin" aria-hidden="true" />}
                Ajouter {choix.length || ""}
              </Button>
            </div>
          </>
        )}

        {onglet === "lien" && (
          <form onSubmit={ajouterLien} className="space-y-3">
            <label htmlFor="lien-source" className="block text-sm font-semibold text-foreground">
              Adresse de la page (article, cours en ligne, PDF en ligne)
            </label>
            <input
              id="lien-source"
              type="url"
              inputMode="url"
              className="input-field"
              placeholder="https://…"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={occupe || !lien.trim()}>
              {occupe && <Loader2 className="animate-spin" aria-hidden="true" />}
              Importer la page
            </Button>
          </form>
        )}

        {onglet === "web" && (
          <>
            <form onSubmit={rechercher} className="space-y-3">
              <label htmlFor="sujet-recherche" className="block text-sm font-semibold text-foreground">
                Sur quel sujet chercher des sources ?
              </label>
              <div className="flex gap-2">
                <input
                  id="sujet-recherche"
                  className="input-field"
                  maxLength={200}
                  placeholder="Ex. : protocole SSH et chiffrement"
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                />
                <Button type="submit" size="icon" className="shrink-0" disabled={occupe} aria-label="Rechercher">
                  {occupe && !resultats ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
                </Button>
              </div>
            </form>
            {resultats?.length > 0 && (
              <>
                <p className="mt-4 text-sm text-muted-foreground">Choisis les pages à ajouter (5 au plus à la fois).</p>
                <ul className="mt-2 rounded-2xl border border-border overflow-hidden max-h-[40vh] overflow-y-auto">
                  {resultats.map((r, i) => (
                    <li key={r.url} className={i > 0 ? "border-t border-border" : ""}>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <input
                          id={`web-${i}`}
                          type="checkbox"
                          className="mt-1 w-5 h-5 accent-primary shrink-0"
                          checked={selection.includes(r.url)}
                          disabled={!selection.includes(r.url) && selection.length >= 5}
                          onChange={() => basculer(selection, setSelection, r.url)}
                        />
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`web-${i}`} className="block font-medium text-foreground leading-snug cursor-pointer">
                            {r.titre}
                          </label>
                          <p className="text-xs text-succes font-medium">{r.domaine}</p>
                          {r.extrait && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.extrait}</p>}
                        </div>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Ouvrir ${r.titre} dans un nouvel onglet`}
                          className="w-9 h-9 grid place-items-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end">
                  <Button onClick={importerSelection} disabled={!selection.length || occupe}>
                    {occupe && <Loader2 className="animate-spin" aria-hidden="true" />}
                    Ajouter {selection.length || ""} source{selection.length > 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {message.texte && (
        <p role={message.type === "erreur" ? "alert" : "status"} className={`mt-4 text-sm ${message.type === "erreur" ? "text-destructive" : "text-succes"}`}>
          {message.texte}
        </p>
      )}
    </Fenetre>
  );
}
