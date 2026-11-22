import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ArrowRight, BookOpen, StickyNote } from "lucide-react";
import { carnetsAPI, coursAPI } from "../services/api";
import { Button } from "../components/ui/button";

/** Liste des carnets : chaque carnet réunit plusieurs cours pour réviser un même examen */
export default function Carnets() {
  const [carnets, setCarnets] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [formulaire, setFormulaire] = useState(false);
  const [titre, setTitre] = useState("");
  const [choisis, setChoisis] = useState([]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    Promise.all([carnetsAPI.lister(), coursAPI.getCours()])
      .then(([c, co]) => {
        setCarnets(c.data.carnets || []);
        setCours(co.data.cours || []);
      })
      .catch(() => setErreur("Impossible de charger tes carnets."))
      .finally(() => setChargement(false));
  }, []);

  const basculer = (id) => setChoisis((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const creer = async (e) => {
    e.preventDefault();
    if (!titre.trim()) return setErreur("Donne un titre à ton carnet.");
    setEnvoi(true);
    setErreur("");
    try {
      const { data } = await carnetsAPI.creer({ titre: titre.trim(), coursIds: choisis });
      setCarnets((l) => [{ ...data.carnet, nbSources: data.carnet.coursIds.length, nbNotes: 0, studio: [] }, ...l]);
      setFormulaire(false);
      setTitre("");
      setChoisis([]);
    } catch (err) {
      setErreur(err.response?.data?.message || "Impossible de créer le carnet.");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async (c) => {
    if (!window.confirm(`Supprimer le carnet « ${c.titre} » ? Tes cours ne sont pas supprimés.`)) return;
    try {
      await carnetsAPI.supprimer(c.id);
      setCarnets((l) => l.filter((x) => x.id !== c.id));
    } catch {
      setErreur("Impossible de supprimer ce carnet.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl text-foreground">Mes carnets</h2>
          <p className="annotation text-base mt-1">Réunis plusieurs cours, puis interroge-les ensemble.</p>
        </div>
        <Button onClick={() => setFormulaire((v) => !v)} aria-expanded={formulaire}>
          <Plus aria-hidden="true" />
          Nouveau carnet
        </Button>
      </div>

      {erreur && (
        <p role="alert" className="rounded-md border border-marge/40 bg-marge/10 px-4 py-3 text-sm text-marge">
          {erreur}
        </p>
      )}

      {formulaire && (
        <form onSubmit={creer} className="bg-card border border-border rounded-lg shadow-md p-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="titre-carnet" className="text-sm font-semibold text-foreground">
              Titre du carnet
            </label>
            <input
              id="titre-carnet"
              className="input-field"
              placeholder="Ex. Partiel de réseaux – janvier"
              maxLength={120}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-foreground mb-2">Sources (tes cours)</legend>
            {cours.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tu n'as pas encore de cours.{" "}
                <Link to="/mes-cours" className="text-primary underline underline-offset-4">
                  Importe un cours
                </Link>{" "}
                d'abord.
              </p>
            ) : (
              <ul className="grid gap-x-6 sm:grid-cols-2 border-t border-border">
                {cours.map((c) => (
                  <li key={c.id} className="border-b border-border">
                    <label htmlFor={`cours-${c.id}`} className="flex items-center gap-3 py-2.5 cursor-pointer">
                      <input
                        id={`cours-${c.id}`}
                        type="checkbox"
                        className="w-5 h-5 accent-primary"
                        checked={choisis.includes(c.id)}
                        onChange={() => basculer(c.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{c.titre}</span>
                        <span className="block text-xs text-muted-foreground">{c.matiere}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          <div className="flex gap-3">
            <Button type="submit" disabled={envoi}>
              Créer le carnet
            </Button>
            <Button type="button" variant="ghost" onClick={() => setFormulaire(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {chargement ? (
        <p role="status" className="text-muted-foreground">
          Chargement…
        </p>
      ) : carnets.length === 0 ? (
        <div className="border border-dashed border-input rounded-lg px-6 py-12 text-center bg-card/60">
          <p className="font-display text-2xl text-foreground">Aucun carnet pour l'instant</p>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Un carnet, c'est un examen : tu y ranges les cours qui en parlent, puis tu poses tes questions, tu génères une carte mentale, une FAQ ou un résumé audio.
          </p>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {carnets.map((c) => (
            <li key={c.id} className="group relative bg-card border border-border rounded-md shadow-md hover:shadow-lg transition-shadow">
              <div className="px-5 pt-4 pb-3 border-b-2 border-marge/60 flex items-start justify-between gap-3">
                <h3 className="text-xl leading-snug">
                  <Link to={`/carnets/${c.id}`} className="text-foreground hover:text-primary after:absolute after:inset-0">
                    {c.titre}
                  </Link>
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer le carnet ${c.titre}`}
                  onClick={() => supprimer(c)}
                  className="relative z-10 w-9 h-9 -mr-2 text-muted-foreground hover:text-marge hover:bg-marge/10"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="px-5 py-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  {c.nbSources} source{c.nbSources > 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <StickyNote className="w-4 h-4" aria-hidden="true" />
                  {c.nbNotes} note{c.nbNotes > 1 ? "s" : ""}
                </span>
                <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 group-hover:text-primary transition-transform" aria-hidden="true" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
