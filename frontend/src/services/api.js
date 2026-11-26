/**
 * Service API centralisé — communication avec le backend Express
 * Sécurité : token JWT dans le header Authorization
 * Protection XSS : on ne stocke PAS le token dans localStorage sans sanitisation
 */

import axios from "axios";
import { messageErreur, referenceErreur } from "@/lib/erreurs";

// Utiliser le proxy Vercel (défini dans vercel.json) pour éviter les problèmes de cookies tiers sur mobile
const getBaseURL = () => {
  return "/api";
};

const API_URL = getBaseURL();

// Instance Axios configurée
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 secondes max
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ✅ Envoyer/recevoir les cookies httpOnly
});

// Session : uniquement le cookie httpOnly posé par le serveur (inaccessible au JavaScript).
// Aucun jeton n'est stocké dans le navigateur (ni localStorage, ni sessionStorage) :
// une éventuelle faille XSS ne peut donc pas voler la session.

// ───────────────────────────────────────────────
// Intercepteur RESPONSE — gestion token expiré / session terminée
// ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Message clair et référence prêts à afficher, partout : error.messageUtilisateur
    error.messageUtilisateur = messageErreur(error);
    error.reference = referenceErreur(error);
    // `silencieux` : vérification de session au démarrage, un 401 est alors normal (visiteur)
    if (error.response?.status === 401 && !error.config?.silencieux && !window.location.pathname.includes("/connexion")) {
      window.location.href = "/connexion?session=expiree";
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════
export const authAPI = {
  inscription: (data) => api.post("/auth/inscription", data),
  connexion: (data) => api.post("/auth/connexion", data),
  // Vérification de l'adresse email
  verifierEmail: (token) => api.post("/auth/verifier-email", { token }),
  renvoyerVerification: (email) => api.post("/auth/renvoyer-verification", { email }),
  motDePasseOublie: (email) => api.post("/auth/mot-de-passe-oublie", { email }),
  reinitialiserMotDePasse: (token, nouveauMotDePasse) =>
    api.post("/auth/reinitialiser-mot-de-passe", { token, nouveauMotDePasse }),
  getProfil: (options = {}) => api.get("/auth/profil", options),
  // Jeton de 5 minutes, valable uniquement pour envoyer un fichier au serveur
  jetonUpload: () => api.get("/auth/jeton-upload"),
  updateProfil: (data) => api.put("/auth/profil", data),
  changerMotDePasse: (data) => api.put("/auth/changer-mot-de-passe", data),
  supprimerCompte: (data) => api.delete("/auth/compte", { data }),
  // Portabilité des données (RGPD art. 20)
  exporterDonnees: () => api.get("/auth/export", { responseType: "blob" }),
  logout: () => api.post("/auth/logout"),
  // Appareils connectés (sessions)
  sessions: () => api.get("/auth/sessions"),
  fermerSession: (id) => api.delete(`/auth/sessions/${encodeURIComponent(id)}`),
  fermerAutresSessions: () => api.post("/auth/sessions/deconnecter-autres"),
};

// ═══════════════════════════════════════════════
// Cours
// ═══════════════════════════════════════════════
export const coursAPI = {
  getCours: (params) => api.get("/courses", { params }),
  getCoursParId: (id) => api.get(`/courses/${id}`),
  creerCours: (data) => {
    // 💡 Pour l'envoi de fichiers, on appelle directement le backend (Render)
    // pour contourner la limite de taille (4,5 Mo) du proxy Vercel.
    const directURL = `${import.meta.env.VITE_BACKEND_URL || "https://kaay-nafaar-api-1rtt.onrender.com"}/api/courses`;
    
    if (data instanceof FormData) {
      // Le cookie de session n'est pas envoyé à Render (autre domaine) : on demande
      // d'abord un jeton d'upload de 5 minutes, valable uniquement pour cette route.
      return api.get("/auth/jeton-upload").then(({ data: { jeton } }) =>
        axios.post(directURL, data, {
          headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${jeton}` },
          timeout: 120000,
        })
      );
    }
    return api.post("/courses", data);
  },
  // Une page web (article, cours en ligne, PDF en ligne) devient un cours
  importerLien: (url, matiere) => api.post("/courses/depuis-lien", { url, matiere }, { timeout: 60000 }),
  modifierCours: (id, data) => api.put(`/courses/${id}`, data),
  supprimerCours: (id) => api.delete(`/courses/${id}`),
};

// ═══════════════════════════════════════════════
// Fiches
// ═══════════════════════════════════════════════
export const fichesAPI = {
  getFiches: (params) => api.get("/fiches", { params }),
  getFichesPubliques: (params) => api.get("/fiches/publique", { params }),
  getFicheParId: (id) => api.get(`/fiches/${id}`),
  creerFiche: (data) => api.post("/fiches", data),
  modifierFiche: (id, data) => api.put(`/fiches/${id}`, data),
  supprimerFiche: (id) => api.delete(`/fiches/${id}`),
  importerFichePublique: (id) => api.post(`/fiches/${id}/importer`),
  mettreAJourFlashcard: (ficheId, flashcardId, data) =>
    api.put(`/fiches/${ficheId}/flashcard/${flashcardId}`, data),
};

// ═══════════════════════════════════════════════
// Quiz
// ═══════════════════════════════════════════════
export const quizAPI = {
  getQuiz: (params) => api.get("/quiz", { params }),
  getQuizParId: (id) => api.get(`/quiz/${id}`),
  creerQuiz: (data) => api.post("/quiz", data),
  soumettreSession: (id, data) => api.post(`/quiz/${id}/session`, data),
  supprimerQuiz: (id) => api.delete(`/quiz/${id}`),
};

// ═══════════════════════════════════════════════
// Progression
// ═══════════════════════════════════════════════
export const progressionAPI = {
  getProgression: () => api.get("/progression"),
  ajouterPlanning: (data) => api.post("/progression/planning", data),
  ajouterPlanningBulk: (data) => api.post("/progression/planning/bulk", data),
  completerSession: (id, data) => api.put(`/progression/planning/${id}`, data),
};

// ═══════════════════════════════════════════════
// IA — Streaming via EventSource (SSE)
// ═══════════════════════════════════════════════
export const feedbackAPI = {
  envoyer: (data) => api.post("/ai/feedback", data),
};

export const iaAPI = {
  genererFicheStream: (data, onDelta, onDone, onError) => {
    return fetchStream("/ai/generer-fiche", data, onDelta, onDone, onError);
  },

  genererQuizStream: (data, onDelta, onDone, onError) => {
    return fetchStream("/ai/generer-quiz", data, onDelta, onDone, onError);
  },

  expliquerStream: (data, onDelta, onDone, onError) => {
    return fetchStream("/ai/expliquer", data, onDelta, onDone, onError);
  },

  chatStream: (data, onDelta, onDone, onError) => {
    return fetchStream("/ai/chat", data, onDelta, onDone, onError);
  },

  genererPlanning: (data) => api.post("/ai/planning", data),
};

/**
 * Fetch avec streaming SSE — gère les Server-Sent Events
 */
/**
 * Lecture d'un flux SSE (« data: {json} ») envoyé par le serveur.
 * Gestionnaires nommés : onPassages, onDelta, onSuivi, onDone, onError.
 * Renvoie un AbortController pour interrompre la réponse.
 */
const fluxSSE = (endpoint, body, gestionnaires = {}) => {
  const controller = new AbortController();
  const { onPassages, onDelta, onSuivi, onDone, onError } = gestionnaires;
  const chemin = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const traiter = (ligne) => {
    const t = ligne.trim();
    if (!t.startsWith("data: ")) return;
    let evenement;
    try {
      evenement = JSON.parse(t.slice(6));
    } catch (_) {
      return; // ligne malformée ignorée
    }
    if (evenement.passages) onPassages?.(evenement.passages);
    else if (evenement.error) onError?.(evenement.error);
    else if (evenement.suivi) onSuivi?.(evenement.suivi);
    else if (evenement.done) onDone?.(evenement);
    else if (evenement.delta) onDelta?.(evenement.delta);
  };

  (async () => {
    try {
      const response = await fetch(`${API_URL}${chemin}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        onError?.(err.message || "Erreur serveur");
        return;
      }
      if (!response.body) {
        onError?.("Réponse vide du serveur");
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let tampon = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        tampon += decoder.decode(value, { stream: true });
        const lignes = tampon.split("\n");
        tampon = lignes.pop() || "";
        lignes.forEach(traiter);
      }
      if (tampon) traiter(tampon);
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err.message);
    }
  })();

  return controller;
};

// Ancienne signature, conservée pour l'assistant, les fiches et les quiz
const fetchStream = (endpoint, body, onDelta, onDone, onError, onPassages) =>
  fluxSSE(endpoint, body, { onDelta, onDone, onError, onPassages });

export const analyticsAPI = {
  get: () => api.get("/analytics"),
};

export default api;

// ═══════════════════════════════════════════════
// Carnets (plusieurs cours, chat avec citations, studio)
// ═══════════════════════════════════════════════
export const carnetsAPI = {
  lister: () => api.get("/carnets"),
  creer: (data) => api.post("/carnets", data),
  obtenir: (id) => api.get(`/carnets/${id}`),
  modifier: (id, data) => api.put(`/carnets/${id}`, data),
  supprimer: (id) => api.delete(`/carnets/${id}`),
  reglages: (id, reglages) => api.put(`/carnets/${id}/reglages`, reglages),
  // Notes
  ajouterNote: (id, note) => api.post(`/carnets/${id}/notes`, note),
  supprimerNote: (id, noteId) => api.delete(`/carnets/${id}/notes/${noteId}`),
  noteEnSource: (id, noteId) => api.post(`/carnets/${id}/notes/${noteId}/source`),
  // Guide et chat
  guide: (id, forcer = false) => api.get(`/carnets/${id}/guide`, { params: forcer ? { forcer: 1 } : {}, timeout: 90000 }),
  messages: (id) => api.get(`/carnets/${id}/messages`),
  effacerMessages: (id) => api.delete(`/carnets/${id}/messages`),
  chatStream: (id, { question, coursIds }, gestionnaires) => fluxSSE(`/carnets/${id}/chat`, { question, coursIds }, gestionnaires),
  // Studio (la génération peut prendre du temps sur les modèles gratuits)
  studio: (id, type, options = {}, coursIds = []) =>
    api.post(`/carnets/${id}/studio`, { type, options, coursIds }, { timeout: 150000 }),
  supprimerProduction: (id, pid) => api.delete(`/carnets/${id}/productions/${pid}`),
  exporterProduction: (id, pid) => api.post(`/carnets/${id}/productions/${pid}/exporter`),
  intervention: (id, pid, question, position) =>
    api.post(`/carnets/${id}/productions/${pid}/intervention`, { question, position }, { timeout: 60000 }),
  // Découverte de sources sur le web
  decouvrir: (id, sujet) => api.post(`/carnets/${id}/decouvrir`, { sujet }, { timeout: 45000 }),
  ajouterSourcesWeb: (id, urls) => api.post(`/carnets/${id}/sources/web`, { urls }, { timeout: 90000 }),
};
