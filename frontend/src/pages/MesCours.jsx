/**
 * Page Mes Cours — CRUD des cours + upload PDF
 */

import React, { useState, useEffect, useRef } from "react";
import { coursAPI } from "../services/api";

const NIVEAUX = ["débutant", "intermédiaire", "avancé"];

export default function MesCours() {
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [form, setForm] = useState({
    titre: "", matiere: "", contenu: "", niveau: "intermédiaire",
    tags: "", dureeEstimee: 30,
  });
  const [fichier, setFichier] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const fileInputRef = useRef();

  useEffect(() => { chargerCours(); }, []);

  const chargerCours = async () => {
    try {
      const { data } = await coursAPI.getCours();
      setCours(data.cours ?? []);
    } catch (_) {
      setErreur("Impossible de charger les cours.");
    } finally {
      setChargement(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.matiere.trim() || !form.contenu.trim()) {
      setErreur("Titre, matière et contenu sont requis.");
      return;
    }
    setEnvoi(true);
    setErreur("");
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (fichier) formData.append("fichier", fichier);

      await coursAPI.creerCours(formData);
      setAfficherFormulaire(false);
      setForm({ titre: "", matiere: "", contenu: "", niveau: "intermédiaire", tags: "", dureeEstimee: 30 });
      setFichier(null);
      chargerCours();
    } catch (err) {
      setErreur(err.response?.data?.message || "Erreur lors de la création.");
    } finally {
      setEnvoi(false);
    }
  };

  const supprimerCours = async (id) => {
    if (!window.confirm("Supprimer ce cours ?")) return;
    try {
      await coursAPI.supprimerCours(id);
      setCours((prev) => prev.filter((c) => c._id !== id));
    } catch (_) {
      setErreur("Impossible de supprimer.");
    }
  };

  const coursFiltres = cours.filter(
    (c) =>
      c.titre.toLowerCase().includes(recherche.toLowerCase()) ||
      c.matiere.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📚 Mes Cours</h2>
          <p className="text-gray-500 text-sm">{cours.length} cours enregistrés</p>
        </div>
        <button onClick={() => setAfficherFormulaire(true)} className="btn-primary">
          + Ajouter un cours
        </button>
      </div>

      {/* Barre de recherche */}
      <input
        type="search"
        className="input-field max-w-sm"
        placeholder="🔍 Rechercher un cours…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        maxLength={100}
      />

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
          {erreur}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {afficherFormulaire && (
        <div className="card border-2 border-primary-200 animate-slide-up">
          <h3 className="font-semibold text-gray-900 mb-4">Nouveau cours</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  className="input-field" placeholder="ex: Algorithmes de tri" required
                  value={form.titre} maxLength={200}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matière *</label>
                <input
                  className="input-field" placeholder="ex: Informatique" required
                  value={form.matiere} maxLength={100}
                  onChange={(e) => setForm({ ...form, matiere: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contenu du cours * <span className="text-gray-400 text-xs">(colle le texte ici)</span>
              </label>
              <textarea
                className="input-field h-36 resize-none" required
                placeholder="Colle le contenu de ton cours ici…"
                value={form.contenu} maxLength={50000}
                onChange={(e) => setForm({ ...form, contenu: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                <select className="input-field" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}>
                  {NIVEAUX.map((n) => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min)</label>
                <input type="number" min="5" max="300" className="input-field"
                  value={form.dureeEstimee}
                  onChange={(e) => setForm({ ...form, dureeEstimee: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par ",")</label>
                <input className="input-field" placeholder="ex: tri, algo" value={form.tags} maxLength={200}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
            </div>

            {/* Upload PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PDF (optionnel, max 10 Mo)</label>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f && f.size > 10 * 1024 * 1024) { setErreur("Fichier trop grand (max 10 Mo)."); return; }
                  setFichier(f || null);
                }}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm">
                📎 {fichier ? fichier.name : "Choisir un fichier"}
              </button>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={envoi} className="btn-primary">
                {envoi ? "Enregistrement…" : "Enregistrer le cours"}
              </button>
              <button type="button" onClick={() => { setAfficherFormulaire(false); setErreur(""); }}
                className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des cours */}
      {chargement ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : coursFiltres.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">📚</p>
          <p className="font-medium">
            {recherche ? "Aucun cours trouvé." : "Aucun cours encore. Ajoute ton premier cours !"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coursFiltres.map((c) => (
            <div key={c._id} className="card hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900 truncate flex-1 pr-2">{c.titre}</h3>
                <button
                  onClick={() => supprimerCours(c._id)}
                  className="text-red-400 hover:text-red-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Supprimer"
                >
                  🗑️
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="badge bg-primary-100 text-primary-700">{c.matiere}</span>
                <span className="badge bg-gray-100 text-gray-600">{c.niveau}</span>
                <span className="badge bg-blue-100 text-blue-700">⏱️ {c.dureeEstimee} min</span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{c.contenu}</p>
              {c.resumeIA && (
                <p className="text-xs text-primary-600 mt-2 italic">✨ Résumé IA disponible</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
