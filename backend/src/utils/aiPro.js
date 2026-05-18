/**
 * Moteur IA Avancé — Kaay Nafaar
 * Gestion des Embeddings, RAG et Recherche Sémantique
 */

const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { PGVectorStore } = require("@langchain/community/vectorstores/pgvector");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

// Configuration des Embeddings (Google Gemini)
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY || "placeholder",
  model: "text-embedding-004",
});

// Configuration du Vector Store Postgres
const config = {
  postgresConnectionOptions: {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "user_admin",
    password: process.env.DB_PASSWORD || "password_secret",
    database: process.env.DB_NAME || "kaay_nafaar",
  },
  tableName: "course_embeddings",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "text",
    metadataColumnName: "metadata",
  },
};

/**
 * Indexer un cours pour la recherche sémantique
 * @param {string} text - Contenu du cours
 * @param {object} metadata - { coursId, utilisateurId, titre }
 */
const indexerCours = async (text, metadata) => {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text], [metadata]);
    
    const vectorStore = await PGVectorStore.initialize(embeddings, config);
    await vectorStore.addDocuments(docs);

    // Invalider le cache RAG de l'utilisateur (incrémente la version)
    await redis.incr(`rag:version:${metadata.utilisateurId}`);
    
    console.log(`✅ Cours indexé (${docs.length} segments) — cache RAG invalidé`);
    return true;
  } catch (err) {
    console.error("❌ Erreur indexation vectorielle:", err.message);
    return false;
  }
};

const crypto = require("crypto");
const { redis } = require("../config/redis");

/**
 * Clé de cache RAG avec version et hash SHA256 complet
 */
const cleCacheRAG = async (userId, query) => {
  const version = await redis.get(`rag:version:${userId}`) || "0";
  const hash = crypto.createHash("sha256").update(query).digest("hex");
  return `rag:${userId}:${version}:${hash}`;
};

/**
 * Rechercher des segments de cours pertinents (RAG)
 * @param {string} query - Question de l'utilisateur
 * @param {number} userId - Pour filtrer les documents de l'utilisateur
 */
const rechercherContexte = async (query, userId) => {
  try {
    const cacheKey = await cleCacheRAG(userId, query);
    
    // Vérifier le cache Redis
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      console.log("⚡ RAG : Résultat récupéré du cache");
      return JSON.parse(cachedResult);
    }

    const vectorStore = await PGVectorStore.initialize(embeddings, config);
    
    // Recherche sémantique avec filtrage par utilisateur
    const results = await vectorStore.similaritySearch(query, 4, {
      utilisateurId: userId
    });

    const context = results.map(r => r.pageContent).join("\n\n");
    const sources = [...new Set(results.map(r => JSON.stringify({ 
      id: r.metadata.coursId, 
      titre: r.metadata.titre 
    })))].map(s => JSON.parse(s));

    const finalResult = { context, sources };

    // Stocker dans Redis pendant 1 heure
    if (context) {
      await redis.set(cacheKey, JSON.stringify(finalResult), "EX", 3600);
    }

    return finalResult;
  } catch (err) {
    console.error("❌ Erreur recherche sémantique:", err.message);
    return { context: "", sources: [] };
  }
};

module.exports = {
  indexerCours,
  rechercherContexte
};
