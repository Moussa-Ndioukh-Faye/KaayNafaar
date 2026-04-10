/**
 * Page Profil — Paramètres utilisateur et تغيير mot de passe
 */

import React, { useState } from "react";
import { useAuth } from "../App";
import { authAPI } from "../services/api";

export default function Profil() {
  const { utilisateur, connecter, deconnecter } = useAuth();
  const [form, setForm] = useState({
    nom: utilisateur?.nom || "",
    email: utilisateur?.email || "",
  });
  const [motDePasse, setMotDePasse] = useState({
    actuel: "",
    nouveau: "",
    confirmation: "",
  });
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState({ type: "", texte: "" });
  const [afficherMDP, setAfficherMDP] = useState(false);

  const mettreAJourProfil = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.email.trim()) {
      setMessage({ type: "error", texte: "Nom et email requis." });
      return;
    }
    setEnvoi(true);
    try {
      const { data } = await authAPI.updateProfil({ nom: form.nom.trim(), email: form.email.trim() });
      if (data.success) {
        connecter(null, data.utilisateur);
        setMessage({ type: "success", texte: "Profil mis à jour." });
      }
    } catch (_) {
      setMessage({ type: "error", texte: "Erreur lors de la mise à jour." });
    } finally {
      setEnvoi(false);
    }
  };

  const changerMotDePasse = async (e) => {
    e.preventDefault();
    if (motDePasse.nouveau !== motDePasse.confirmation) {
      setMessage({ type: "error", texte: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (motDePasse.nouveau.length < 8) {
      setMessage({ type: "error", texte: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    setEnvoi(true);
    try {
      const { data } = await authAPI.changerMotDePasse({
        motDePasseActuel: motDePasse.actuel,
        nouveauMotDePasse: motDePasse.nouveau,
      });
      if (data.success) {
        setMotDePasse({ actuel: "", nouveau: "", confirmation: "" });
        setMessage({ type: "success", texte: "Mot de passe changé." });
      }
    } catch (_) {
      setMessage({ type: "error", texte: "Mot de passe actuel incorrect." });
    } finally {
      setEnvoi(false);
    }
  };

  const supprimerCompte = async () => {
    if (!window.confirm("Êtes-vous sûr ? Cette action est irréversible.")) return;
    if (!window.confirm("Confirmer la suppression du compte ?")) return;
    try {
      await authAPI.supprimerCompte();
      deconnecter();
      window.location.href = "/";
    } catch (_) {
      setMessage({ type: "error", texte: "Erreur lors de la suppression." });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900">⚙️ Mon Profil</h2>

      {message.texte && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.texte}
        </div>
      )}

      {/* Informations personnelles */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Informations personnelles</h3>
        <form onSubmit={mettreAJourProfil} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              className="input-field"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={envoi} className="btn-primary">
            {envoi ? "Mise à jour..." : "Enregistrer"}
          </button>
        </form>
      </div>

      {/* Changer mot de passe */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Changer mon mot de passe</h3>
        <form onSubmit={changerMotDePasse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              className="input-field"
              value={motDePasse.actuel}
              onChange={(e) => setMotDePasse({ ...motDePasse, actuel: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              className="input-field"
              value={motDePasse.nouveau}
              onChange={(e) => setMotDePasse({ ...motDePasse, nouveau: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              className="input-field"
              value={motDePasse.confirmation}
              onChange={(e) => setMotDePasse({ ...motDePasse, confirmation: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={envoi} className="btn-primary">
            {envoi ? "Changement..." : "Changer le mot de passe"}
          </button>
        </form>
      </div>

      {/* Supprimer compte */}
      <div className="card border-red-200">
        <h3 className="font-semibold text-red-700 mb-4">Zone dangereuse</h3>
        <p className="text-sm text-gray-600 mb-4">
          La suppression de votre compte est irréversible. Toutes vos données seront perdues.
        </p>
        <button onClick={supprimerCompte} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          Supprimer mon compte
        </button>
      </div>
    </div>
  );
}