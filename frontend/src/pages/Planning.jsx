/**
 * Page Planning — Gestion du planning de révision + Génération IA
 */

import React, { useState, useEffect } from "react";
import { progressionAPI, coursAPI, iaAPI } from "../services/api";

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function Planning() {
  const [planning, setPlanning] = useState([]);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [afficherGenerateur, setAfficherGenerateur] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    matiere: "",
    coursId: "",
    dureeMinutes: 30,
    notes: "",
  });
  const [genForm, setGenForm] = useState({
    dateDebut: new Date().toISOString().split("T")[0],
    dateFin: "",
    disponibilite: 2,
  });
  const [planningGenere, setPlanningGenere] = useState(null);
  const [enGeneration, setEnGeneration] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const [prog, c] = await Promise.all([progressionAPI.getProgression(), coursAPI.getCours()]);
        setPlanning(prog.data.progression?.planning || []);
        setCours(c.data.cours);
      } catch (_) {
        setErreur("Impossible de charger le planning.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const ajouterSession = async (e) => {
    e.preventDefault();
    if (!form.matiere.trim() || !form.date) { setErreur("Date et matière requises."); return; }
    setEnvoi(true);
    try {
      const { data } = await progressionAPI.ajouterPlanning({
        date: form.date,
        matiere: form.matiere.trim(),
        coursId: form.coursId || undefined,
        dureeMinutes: form.dureeMinutes,
        notes: form.notes.trim(),
      });
      setPlanning(data.planning);
      setAfficherFormulaire(false);
      setForm({ date: new Date().toISOString().split("T")[0], matiere: "", coursId: "", dureeMinutes: 30, notes: "" });
    } catch (_) {
      setErreur("Erreur lors de l'ajout.");
    } finally {
      setEnvoi(false);
    }
  };

  const completerSession = async (id) => {
    try {
      await progressionAPI.completerSession(id, { estComplete: true });
      setPlanning((prev) =>
        prev.map((s) => (s._id === id ? { ...s, estComplete: true } : s))
      );
    } catch (_) {
      setErreur("Erreur lors de la mise à jour.");
    }
  };

  const genererPlanningIA = async (e) => {
    e.preventDefault();
    if (!genForm.dateFin) { setErreur("La date de fin est requise."); return; }
    if (new Date(genForm.dateFin) <= new Date(genForm.dateDebut)) {
      setErreur("La date de fin doit être après la date de début.");
      return;
    }
    setEnGeneration(true);
    setErreur("");
    try {
      const { data } = await iaAPI.genererPlanning({
        cours: cours.slice(0, 10).map((c) => ({ titre: c.titre, matiere: c.matiere, duree: c.dureeEstimee })),
        dateDebut: genForm.dateDebut,
        dateFin: genForm.dateFin,
        disponibilite: genForm.disponibilite,
      });
      setPlanningGenere(data.planning);
    } catch (_) {
      setErreur("Erreur de génération du planning.");
    } finally {
      setEnGeneration(false);
    }
  };

  // Grouper le planning par date
  const planningTrié = [...planning].sort((a, b) => new Date(a.date) - new Date(b.date));
  const parDate = planningTrié.reduce((acc, session) => {
    const date = new Date(session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    acc[date] = acc[date] || [];
    acc[date].push(session);
    return acc;
  }, {});

  const prioritéCouleur = { haute: "bg-red-100 text-red-700", moyenne: "bg-yellow-100 text-yellow-700", faible: "bg-green-100 text-green-700" };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📅 Mon Planning de révision</h2>
          <p className="text-gray-500 text-sm">{planning.length} sessions planifiées</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAfficherGenerateur(true)} className="btn-secondary text-sm">
            🤖 Générer avec IA
          </button>
          <button onClick={() => setAfficherFormulaire(true)} className="btn-primary text-sm">
            + Ajouter
          </button>
        </div>
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">{erreur}</div>
      )}

      {/* Formulaire génération IA */}
      {afficherGenerateur && (
        <div className="card border-2 border-purple-200 animate-slide-up">
          <h3 className="font-semibold text-gray-900 mb-4">🤖 Générer un planning intelligent</h3>
          <form onSubmit={genererPlanningIA} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                <input type="date" className="input-field" value={genForm.dateDebut}
                  onChange={(e) => setGenForm({ ...genForm, dateDebut: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                <input type="date" className="input-field" value={genForm.dateFin} required
                  min={genForm.dateDebut}
                  onChange={(e) => setGenForm({ ...genForm, dateFin: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heures disponibles/jour</label>
                <select className="input-field" value={genForm.disponibilite}
                  onChange={(e) => setGenForm({ ...genForm, disponibilite: parseInt(e.target.value) })}>
                  {[1, 2, 3, 4, 6, 8].map((h) => <option key={h} value={h}>{h}h/jour</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={enGeneration} className="btn-primary">
                {enGeneration ? <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Génération…</span> : "✨ Générer"}
              </button>
              <button type="button" onClick={() => { setAfficherGenerateur(false); setPlanningGenere(null); }} className="btn-secondary">Fermer</button>
            </div>
          </form>

          {/* Affichage du planning généré */}
          {planningGenere && (
            <div className="mt-4 space-y-2 border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Planning suggéré :</h4>
              {planningGenere.planning?.map((session, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-500 w-24 flex-shrink-0">
                    {new Date(session.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="font-medium text-gray-900 flex-1">{session.sujet}</span>
                  <span className={`badge ${prioritéCouleur[session.priorite] || "bg-gray-100 text-gray-600"}`}>{session.priorite}</span>
                  <span className="text-gray-500">{session.dureeMinutes}min</span>
                </div>
              ))}
              {planningGenere.conseils_generaux && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">💡 Conseils :</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {planningGenere.conseils_generaux.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Formulaire ajout manuel */}
      {afficherFormulaire && (
        <div className="card border-2 border-primary-200 animate-slide-up">
          <h3 className="font-semibold text-gray-900 mb-4">Nouvelle session de révision</h3>
          <form onSubmit={ajouterSession} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" className="input-field" value={form.date} required
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matière *</label>
                <input className="input-field" placeholder="ex: Mathématiques" required maxLength={100}
                  value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cours associé</label>
                <select className="input-field" value={form.coursId} onChange={(e) => setForm({ ...form, coursId: e.target.value })}>
                  <option value="">-- Aucun --</option>
                  {cours.map((c) => <option key={c._id} value={c._id}>{c.titre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
                <input type="number" min="5" max="480" className="input-field"
                  value={form.dureeMinutes} onChange={(e) => setForm({ ...form, dureeMinutes: parseInt(e.target.value) || 30 })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input className="input-field" placeholder="ex: Chapitres 1 à 3" maxLength={300}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={envoi} className="btn-primary">
                {envoi ? "Ajout…" : "Ajouter la session"}
              </button>
              <button type="button" onClick={() => setAfficherFormulaire(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Planning */}
      {chargement ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : Object.keys(parDate).length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">📅</p>
          <p className="font-medium">Aucune session planifiée.</p>
          <button onClick={() => setAfficherFormulaire(true)} className="btn-primary mt-4">Ajouter une session</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(parDate).map(([date, sessions]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {date}
              </h3>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s._id}
                    className={`card flex items-center gap-4 py-3 transition-all ${s.estComplete ? "opacity-60" : ""}`}
                  >
                    <button
                      onClick={() => !s.estComplete && completerSession(s._id)}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                        s.estComplete
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-primary-500"
                      }`}
                      aria-label={s.estComplete ? "Complété" : "Marquer comme complété"}
                    >
                      {s.estComplete && <span className="text-white text-xs flex items-center justify-center h-full">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-gray-900 ${s.estComplete ? "line-through" : ""}`}>
                        {s.matiere}
                      </p>
                      {s.notes && <p className="text-sm text-gray-500 truncate">{s.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="badge bg-blue-100 text-blue-700 text-xs">⏱️ {s.dureeMinutes}min</span>
                      {s.estComplete && <span className="badge bg-green-100 text-green-700 text-xs">✓ Fait</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
