/**
 * Moteur IA Avancé — Kaay Nafaar
 * Gestion des Embeddings, RAG et Recherche Sémantique
 */

const crypto = require("crypto");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { PGVectorStore } = require("@langchain/community/vectorstores/pgvector");
const { parametres, optionsSSL } = require("../config/connexionPostgres");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { sequelize } = require("../config/database");
const { redis } = require("../config/redis");

// Configuration des Embeddings (Google Gemini)
const embeddings = new GoogleGenerativeAIEmbeddings({
  // Valeur de repli : le serveur démarre même sans clé (les appels IA échoueront proprement)
  apiKey: process.env.GEMINI_API_KEY || "cle-gemini-non-configuree",
  model: "text-embedding-004",
});

// Configuration du Vector Store Postgres
const config = {
  // Construit à la demande : DATABASE_URL peut être corrigée au démarrage (pooler)
  get postgresConnectionOptions() {
    const ssl = optionsSSL();
    return { type: "postgres", ...parametres(), ...(ssl ? { ssl } : {}) };
  },
  tableName: "course_embeddings",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "text",
    metadataColumnName: "metadata",
  },
};

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

  const [vecteur] = await embeddings.embedDocuments([texte]);
  
  try {
    if (redis && typeof redis.set === 'function') {
      await redis.set(cacheKey, JSON.stringify(vecteur), "EX", CACHE_EMBEDDING_TTL);
    }
  } catch (_) { /* Redis non disponible */ }

  return vecteur;
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
 * Recherche hybride : combine vector search + mots-clés (RRF fusion)
 */
const rechercherContexteHybride = async (query, userId, k = 6) => {
  try {
    const cacheKey = await cleCacheRAG(userId, query);

    // 1. Vérifier le cache Redis (silencieux)
    try {
      if (redis && typeof redis.get === 'function') {
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          console.log("⚡ RAG : Résultat récupéré du cache");
          return JSON.parse(cachedResult);
        }
      }
    } catch (_) { /* Redis non disponible */ }

    // 2. Vector search + Keyword search
    const vectorStore = await PGVectorStore.initialize(embeddings, config);
    const [vectorResults, keywordResults] = await Promise.all([
      vectorStore.similaritySearch(query, k * 2, { utilisateurId: userId }).catch(() => []),
      rechercherParMotsCles(query, userId, k * 2).catch(() => []),
    ]);

    // 3. RRF (Reciprocal Rank Fusion)
    const fusionIds = new Map();
    const K = 60;

    const ajouterScore = (results, type) => {
      results.forEach((r, i) => {
        const id = r.pageContent.substring(0, 100);
        if (!fusionIds.has(id)) {
          fusionIds.set(id, { ...r, score: 0, ranks: [] });
        }
        const item = fusionIds.get(id);
        item.ranks.push({ type, rank: i + 1 });
        item.score += 1 / (K + i);
      });
    };

    ajouterScore(vectorResults, "vector");
    ajouterScore(keywordResults, "keyword");

    const fusionnes = [...fusionIds.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    const context = fusionnes.map(r => r.pageContent).join("\n\n");
    const sources = [...new Set(fusionnes.map(r => {
      const meta = r.metadata || {};
      return meta.coursId ? JSON.stringify({ id: meta.coursId, titre: meta.titre }) : null;
    }))].filter(Boolean).map(s => JSON.parse(s));

    const finalResult = { context, sources };

    // Stocker dans Redis (silencieux)
    try {
      if (context && redis && typeof redis.set === 'function') {
        await redis.set(cacheKey, JSON.stringify(finalResult), "EX", 3600);
      }
    } catch (_) { /* Redis non disponible */ }

    return finalResult;
  } catch (err) {
    console.error("❌ Erreur recherche hybride:", err.message);
    return { context: "", sources: [] };
  }
};

const rechercherParMotsCles = async (query, userId, limit = 6) => {
  try {
    const mots = query.replace(/[^\w\s-]/g, "").trim().split(/\s+/).filter(m => m.length > 2).join(" & ");
    if (!mots) return [];

    const sql = `
      SELECT id, text, metadata,
         ts_rank(to_tsvector('french', text), plainto_tsquery('french', :query)) AS score
      FROM course_embeddings
      WHERE metadata->>'utilisateurId' = :userId
        AND to_tsvector('french', text) @@ plainto_tsquery('french', :query)
      ORDER BY score DESC
      LIMIT :limit
    `;

    const results = await sequelize.query(sql, {
      replacements: { query: mots, userId: String(userId), limit },
      type: sequelize.QueryTypes.SELECT,
    });

    return results.map(r => ({
      pageContent: r.text,
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
      score: r.score,
    }));
  } catch (err) {
    console.error("❌ Erreur recherche mots-clés:", err.message);
    return [];
  }
};

const indexerCours = async (text, metadata) => {
  try {
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const docs = await splitter.createDocuments([text], [metadata]);
    const vectorStore = await PGVectorStore.initialize(embeddings, config);
    await vectorStore.addDocuments(docs);
    try {
      if (redis && typeof redis.incr === 'function') {
        await redis.incr(`rag:version:${metadata.utilisateurId}`);
      }
    } catch (_) { /* Redis non disponible */ }
    return true;
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
  indexerCours,
  rechercherContexte,
  rechercherContexteHybride,
  obtenirEmbedding,
  mettreAJourProfilApprenant
};
