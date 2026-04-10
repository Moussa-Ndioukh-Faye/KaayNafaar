/**
 * Service API centralisé — communication avec le backend Express
 * Sécurité : token JWT dans le header Authorization
 * Protection XSS : on ne stocke PAS le token dans localStorage sans sanitisation
 */

import axios from "axios";

// Vite utilise import.meta.env au lieu de process.env
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Instance Axios configurée
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 secondes max
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ✅ Envoyer/recevoir les cookies httpOnly
});

// Note : le token est désormais stocké en cookie httpOnly. Axios n'a plus besoin d'ajouter
// l'en-tête Authorization puisque le navigateur enverra automatiquement le cookie.
// L'intercepteur request disparaît.

// ───────────────────────────────────────────────
// Intercepteur RESPONSE — gestion token expiré / session terminée
// ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // On supprime les infos utilisateur et on force la page de connexion
      localStorage.removeItem("utilisateur");
      window.location.href = "/connexion";
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
  getProfil: () => api.get("/auth/profil"),
  updateProfil: (data) => api.put("/auth/profil", data),
  changerMotDePasse: (data) => api.put("/auth/changer-mot-de-passe", data),
  supprimerCompte: (data) => api.delete("/auth/compte", { data }),
  logout: () => api.post("/auth/logout"),
};

// ═══════════════════════════════════════════════
// Cours
// ═══════════════════════════════════════════════
export const coursAPI = {
  getCours: (params) => api.get("/courses", { params }),
  getCoursParId: (id) => api.get(`/courses/${id}`),
  creerCours: (data) => {
    // Si data contient un fichier PDF, utiliser FormData
    if (data instanceof FormData) {
      return api.post("/courses", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return api.post("/courses", data);
  },
  modifierCours: (id, data) => api.put(`/courses/${id}`, data),
  supprimerCours: (id) => api.delete(`/courses/${id}`),
};

// ═══════════════════════════════════════════════
// Fiches
// ═══════════════════════════════════════════════
export const fichesAPI = {
  getFiches: (params) => api.get("/fiches", { params }),
  getFicheParId: (id) => api.get(`/fiches/${id}`),
  creerFiche: (data) => api.post("/fiches", data),
  modifierFiche: (id, data) => api.put(`/fiches/${id}`, data),
  supprimerFiche: (id) => api.delete(`/fiches/${id}`),
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
  completerSession: (id, data) => api.put(`/progression/planning/${id}`, data),
};

// ═══════════════════════════════════════════════
// IA — Streaming via EventSource (SSE)
// ═══════════════════════════════════════════════
export const iaAPI = {
  /**
   * Génère une fiche avec streaming SSE
   * @param {object} data - { contenuCours, titreCours, coursId }
   * @param {function} onDelta - Callback pour chaque chunk reçu
   * @param {function} onDone - Callback à la fin avec la fiche complète
   * @param {function} onError - Callback d'erreur
   */
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
 * Retourne une AbortController pour annuler le stream
 */
const fetchStream = (endpoint, body, onDelta, onDone, onError) => {
  const controller = new AbortController();
  const token = localStorage.getItem("token");

  fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        onError?.(err.message || "Erreur serveur");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const read = async () => {
        const { done, value } = await reader.read();
        if (done) return;

        const chunk = decoder.decode(value, { stream: true });
        // Chaque ligne SSE commence par "data: "
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) {
              onError?.(parsed.error);
            } else if (parsed.done) {
              onDone?.(parsed);
            } else if (parsed.delta) {
              onDelta?.(parsed.delta);
            }
          } catch (_) {
            // Ignorer les lignes malformées
          }
        }

        read();
      };

      read();
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError?.(err.message);
      }
    });

  return controller; // Retourner pour permettre l'annulation
};

export default api;
