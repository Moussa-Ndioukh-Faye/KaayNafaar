/**
 * Orchestrateur de Recherche Hybride — Kaay Nafaar
 * Gère la priorité Local RAG vs Web Search (Tavily)
 */

const { rechercherContexteHybride } = require("./aiPro");
const { webSearch } = require("./tavily");
const crypto = require("crypto");

/**
 * Orchestre la recherche d'informations pour une requête utilisateur
 */
const orchestrerRecherche = async (query, userId, _options = {}) => {
  // --- CACHE DÉSACTIVÉ POUR RÉSOUDRE LES HALLUCINATIONS ---
  /*
  const cacheKey = `${CACHE_ORCH_PREFIX}${userId}:${crypto.createHash("sha256").update(query.toLowerCase()).digest("hex")}`;
  try {
    if (redis && typeof redis.get === 'function') {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log("⚡ Orchestrateur : Résultat récupéré du cache");
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.warn("⚠️ Orchestrateur : Erreur lors de la lecture du cache Redis (ignorée)");
  }
  */

  console.log(`🔍 Orchestration recherche pour: "${query}" (Tavily Key: ${process.env.TAVILY_API_KEY ? "OK" : "MANQUANTE"})`);

  // 1. Recherche Locale (Hybride : Vector + Mots-clés)
  let localResults = { context: "", sources: [] };
  try {
    localResults = await rechercherContexteHybride(query, userId, 6);
    console.log(`🏠 Résultats locaux trouvés: ${!!localResults.context}`);
  } catch (error) {
    console.error("❌ Orchestrateur : Erreur recherche locale", error.message);
  }
  
  let useWeb = false;
  let webResults = [];

  // 2. Décider si on a besoin du Web
  if (!localResults.context || localResults.context.trim() === "") {
    console.log("ℹ️ Aucun résultat local. Activation Web Search.");
    useWeb = true;
  } 
  else if (/(cherche|trouve|web|internet|actualité|récent|nouvelle|senegal|sénégal|2024|2025|aujourd'hui|maintenant|qui est|président|president)/i.test(query)) {
    console.log("ℹ️ Mot-clé web/actualité détecté. Activation Web Search.");
    useWeb = true;
  }

  // 3. Exécuter la recherche Web si nécessaire
  if (useWeb) {
    try {
      console.log("🌐 Lancement de la recherche web (Tavily)...");
      // On enrichit la requête pour forcer l'actualité si c'est une question de fait
      const enrichedQuery = query.toLowerCase().includes("senegal") ? `${query} président actuel 2024 2025` : query;
      webResults = await webSearch(enrichedQuery, { limit: 5 });
      console.log(`🌐 ${webResults.length} résultats web récupérés.`);
    } catch (error) {
      console.error("❌ Orchestrateur : Erreur recherche web", error.message);
    }
  }

  // 4. Fusionner et Formater
  const sources = [...(localResults.sources || [])];
  let fullContext = localResults.context || "";

  if (webResults && webResults.length > 0) {
    console.log(`🔗 Fusion de ${webResults.length} résultats web au contexte.`);
    const webContext = webResults.map(r => `[SOURCE WEB: ${r.title}] (${r.url}): ${r.content}`).join("\n\n");
    
    if (fullContext) {
      fullContext = `--- DOCUMENTS UTILISATEUR (PRIORITÉ COURS) ---\n${fullContext}\n\n--- COMPLÉMENTS WEB RÉCENTS (ACTUALITÉ 2024-2025) ---\n${webContext}`;
    } else {
      fullContext = `--- COMPLÉMENTS WEB RÉCENTS (ACTUALITÉ 2024-2025) ---\n${webContext}`;
    }

    webResults.forEach(r => {
      sources.push({ 
        id: `web-${crypto.createHash("md5").update(r.url).digest("hex")}`, 
        titre: r.title, 
        url: r.url, 
        isWeb: true 
      });
    });
  }

  const finalResult = {
    context: fullContext,
    sources: sources,
    usedWeb: webResults.length > 0,
    usedLocal: !!localResults.context && localResults.context.trim() !== ""
  };

  return finalResult;
};

module.exports = { orchestrerRecherche };
