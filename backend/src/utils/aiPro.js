/**
 * Moteur IA Avancé — Kaay Nafaar
 * Embeddings (Gemini), cache, et points d'entrée RAG de l'assistant
 */

const crypto = require("crypto");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { redis } = require("../config/redis");

// Configuration des Embeddings (Google Gemini)
const embeddings = new GoogleGenerativeAIEmbeddings({
  // Valeur de repli : le serveur démarre même sans clé (les appels IA échoueront proprement)
  apiKey: process.env.GEMINI_API_KEY || "cle-gemini-non-configuree",
  // text-embedding-004 a été arrêté le 14 janvier 2026 ; remplaçant recommandé : gemini-embedding-2
  model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
  // Nouvelles tentatives gérées ici (avecReessais) pour maîtriser l'attente sur 429/503
  maxRetries: 0,
});

const { avecReessais } = require("./reessai");

/** Un vecteur vide ou absent est une erreur (sinon un passage serait indexé sans embedding) */
const verifierVecteurs = (vecteurs, attendus) => {
  if (!Array.isArray(vecteurs) || vecteurs.length !== attendus || vecteurs.some((v) => !Array.isArray(v) || !v.length)) {
    throw Object.assign(new Error("Embeddings incomplets renvoyés par Gemini"), { status: 503 });
  }
  return vecteurs;
};

// Les passages sont stockés dans la table course_embeddings (pgvector) :
// écriture dans utils/indexation.js, lecture dans utils/passages.js.

const CACHE_EMBEDDING_PREFIX = "embedding:";
const CACHE_EMBEDDING_TTL = 86400; // 24h

const obtenirEmbedding = async (texte) => {
  const hash = crypto.createHash("sha256").update(texte).digest("hex");
  const cacheKey = `${CACHE_EMBEDDING_PREFIX}${hash}`;

  try {
    if (redis && typeof redis.get === 'function') {
      const cache = await redis.get(cacheKey);
      if (cache) return JSON.parse(cache);
    }
  } catch (_) { /* Redis non disponible */ }

  const [vecteur] = await avecReessais(
    async () => verifierVecteurs(await embeddings.embedDocuments([texte]), 1),
    { tentatives: 3, base: 800, quoi: "Embedding de la question" }
  );
  
  try {
    if (redis && typeof redis.set === 'function') {
      await redis.set(cacheKey, JSON.stringify(vecteur), "EX", CACHE_EMBEDDING_TTL);
    }
  } catch (_) { /* Redis non disponible */ }

  return vecteur;
};

/** Embeddings d'une liste de passages (indexation, par lots) — patient : l'indexation n'est pas pressée */
const embedderTextes = async (textes) => {
  if (!textes.length) return [];
  return avecReessais(async () => verifierVecteurs(await embeddings.embedDocuments(textes), textes.length), {
    tentatives: 5,
    base: 3000,
    quoi: "Embeddings des passages",
  });
};

/** Change la « version » RAG de l'utilisateur : les résultats en cache deviennent obsolètes */
const invaliderCacheRAG = async (userId) => {
  try {
    if (redis && typeof redis.incr === "function") await redis.incr(`rag:version:${userId}`);
  } catch (_) { /* Redis non disponible */ }
};

/**
 * Clé de cache RAG avec version et hash SHA256 complet
 */
const cleCacheRAG = async (userId, query) => {
  try {
    let version = "0";
    if (redis && typeof redis.get === 'function') {
      version = await redis.get(`rag:version:${userId}`) || "0";
    }
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    return `rag:${userId}:${version}:${hash}`;
  } catch (_) {
    return `rag:${userId}:0:${crypto.createHash("sha256").update(query).digest("hex")}`;
  }
};

/**
 * Contexte pour l'assistant : même moteur que les carnets (rechercherPassages),
 * sur tous les cours de l'étudiant. Résultat mis en cache 1 h (invalidé à chaque indexation).
 */
const rechercherContexteHybride = async (query, userId, k = 6) => {
  try {
    const cacheKey = await cleCacheRAG(userId, query);
    try {
      if (redis && typeof redis.get === "function") {
        const enCache = await redis.get(cacheKey);
        if (enCache) return JSON.parse(enCache);
      }
    } catch (_) { /* Redis non disponible */ }

    const { rechercherPassages, formaterPassages } = require("./passages");
    const passages = await rechercherPassages({ question: query, userId, k });
    const vus = new Set();
    const sources = passages
      .filter((p) => p.coursId && !vus.has(p.coursId) && vus.add(p.coursId))
      .map((p) => ({ id: p.coursId, titre: p.titre }));
    const resultat = { context: formaterPassages(passages), sources };

    try {
      if (resultat.context && redis && typeof redis.set === "function") {
        await redis.set(cacheKey, JSON.stringify(resultat), "EX", 3600);
      }
    } catch (_) { /* Redis non disponible */ }
    return resultat;
  } catch (err) {
    console.error("❌ Erreur recherche hybride:", err.message);
    return { context: "", sources: [] };
  }
};

/** Indexation d'un cours (voir utils/indexation.js) ; renvoie true si au moins un passage */
const indexerCours = async (text, metadata, pages = null) => {
  try {
    const { indexerDocument } = require("./indexation");
    const n = await indexerDocument({ ...metadata, texte: text, pages });
    return n > 0;
  } catch (err) {
    console.error("❌ Erreur indexation vectorielle:", err.message);
    return false;
  }
};

const rechercherContexte = async (query, userId) => {
  return rechercherContexteHybride(query, userId, 6);
};

const mettreAJourProfilApprenant = async (userId, userMessage, _assistantResponse) => {
  try {
    const User = require("../models/User");
    const user = await User.findByPk(userId);
    if (!user) return;
    const date = new Date().toLocaleDateString("fr-FR");
    const nouvelInsight = `[${date}] Interaction: "${userMessage.substring(0, 50)}..."`;
    let memoire = user.memoireLongTerme || "";
    const lignes = memoire.split("\n").filter(l => l.trim());
    lignes.unshift(nouvelInsight);
    user.memoireLongTerme = lignes.slice(0, 50).join("\n");
    await user.save();
  } catch (err) {
    console.error("❌ Erreur mise à jour profil apprenant:", err.message);
  }
};

module.exports = {
  embedderTextes,
  invaliderCacheRAG,
  indexerCours,
  rechercherContexte,
  rechercherContexteHybride,
  obtenirEmbedding,
  mettreAJourProfilApprenant,
};
