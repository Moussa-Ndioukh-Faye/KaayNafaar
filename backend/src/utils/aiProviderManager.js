const OpenAI = require("openai");

// Modèles réglables sans toucher au code : Google et Groq retirent régulièrement
// d'anciens modèles (gemini-2.0-flash a été arrêté le 1er juin 2026).
const PROVIDERS = [
  {
    name: "gemini",
    client: null,
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKeyEnv: "GEMINI_API_KEY",
    maxRetries: 3,
    timeout: 60000,
  },
  {
    name: "groq",
    client: null,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    maxRetries: 2,
    timeout: 30000,
  },
];

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);
const RETRYABLE_ERRORS = [/timeout/i, /econnreset/i, /econnrefused/i, /network/i, /rate limit/i, /quota/i, /unauthorized/i, /auth/i];

const initializeProviders = () => {
  for (const p of PROVIDERS) {
    const apiKey = process.env[p.apiKeyEnv];
    if (apiKey) {
      p.client = new OpenAI({
        apiKey,
        baseURL: p.baseURL,
        maxRetries: p.maxRetries,
        timeout: p.timeout,
      });
    }
  }
  const actifs = PROVIDERS.filter(p => p.client);
  if (process.env.NODE_ENV !== "test") {
    if (actifs.length) {
      console.log(`🤖 Fournisseurs IA actifs : ${actifs.map(p => `${p.name} (${p.model})`).join(", ")}`);
    } else {
      console.error("⚠️ Aucun fournisseur IA configuré : définir GEMINI_API_KEY et/ou GROQ_API_KEY.");
    }
  }
  return actifs;
};

const estRetryable = (err) => {
  if (RETRYABLE_STATUSES.has(err.status)) return true;
  if (err.code && RETRYABLE_ERRORS.some(r => r.test(err.code))) return true;
  if (err.message && RETRYABLE_ERRORS.some(r => r.test(err.message))) return true;
  return false;
};

class AIProviderManager {
  constructor() {
    this.providers = initializeProviders();
    this.currentIndex = 0;
  }

  estDisponible() {
    return this.providers.length > 0;
  }

  getPreferes(ordre = null) {
    if (ordre) {
      const tries = ordre.map(nom => this.providers.find(p => p.name === nom)).filter(Boolean);
      return tries.length > 0 ? tries : this.providers;
    }
    return this.providers;
  }

  async streamComplete({ messages, onDelta, onDone, onError, maxTokens = 4096, ordre = null }) {
    const tries = this.getPreferes(ordre);
    let derniereErreur = null;

    for (const provider of tries) {
      try {
        const stream = await provider.client.chat.completions.create({
          model: provider.model,
          messages,
          stream: true,
          max_tokens: maxTokens,
          temperature: 0.1,
        });

        let texteAccumule = "";
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            texteAccumule += delta;
            onDelta?.(delta);
          }
        }

        await onDone?.(texteAccumule);
        return texteAccumule;
      } catch (err) {
        console.error(`❌ Provider ${provider.name} (${provider.model}):`, err.message);
        derniereErreur = err;
        if (provider !== tries[tries.length - 1]) {
          continue;
        }
        break;
      }
    }

    const message = estRetryable(derniereErreur)
      ? "Service IA temporairement surchargé. Réessaie dans quelques instants."
      : "Erreur de connexion au service IA. Réessaie.";
    onError?.(message, derniereErreur);
    return null;
  }

  async complete({ messages, maxTokens = 4096, ordre = null }) {
    const tries = this.getPreferes(ordre);
    let derniereErreur = null;

    for (const provider of tries) {
      try {
        const response = await provider.client.chat.completions.create({
          model: provider.model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.1,
        });
        return response.choices[0]?.message?.content || "";
      } catch (err) {
        console.error(`❌ Provider ${provider.name} (${provider.model}):`, err.message);
        derniereErreur = err;
        if (provider !== tries[tries.length - 1]) {
          continue;
        }
        break;
      }
    }

    throw derniereErreur || new Error("Aucun fournisseur IA disponible");
  }
}

module.exports = { AIProviderManager };
