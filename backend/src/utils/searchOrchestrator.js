/**
 * Orchestrateur de Recherche Hybride — Kaay Nafaar
 * Gère la priorité Local RAG vs Web Search (Tavily)
 */

const { rechercherContexteHybride } = require("./aiPro");
const { webSearch } = require("./tavily");
/**
 * Orchestre la recherche d'informations pour une requête utilisateur
 */
const orchestrerRecherche = async (query, userId) => {

  // 1. Recherche Locale (Hybride : Vector + Mots-clés)
  let localResults = { context: "", sources: [] };
  try {
    localResults = await rechercherContexteHybride(query, userId, 6);
  } catch (error) {
    console.error("Orchestrateur : Erreur recherche locale", error.message);
  }
  
  let useWeb = false;
  let webResults = [];

  // 2. Décider si on a besoin du Web
  if (!localResults.context || localResults.context.trim() === "") {
    useWeb = true;
  } 
  else if (/(cherche|trouve|web|internet|actualité|récent|nouvelle|senegal|sénégal|2024|2025|aujourd'hui|maintenant|qui est|président|president)/i.test(query)) {
    useWeb = true;
  }

  // 3. Exécuter la recherche Web si nécessaire
  if (useWeb) {
    try {
      const enrichedQuery = query.toLowerCase().includes("senegal") ? `${query} président actuel 2024 2025` : query;
      webResults = await webSearch(enrichedQuery, { limit: 5 });
    } catch (error) {
      console.error("Orchestrateur : Erreur recherche web", error.message);
    }
  }

  // 4. Fusionner et Formater
  const sources = [...(localResults.sources || [])];
  let fullContext = localResults.context || "";

  if (webResults && webResults.length > 0) {
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
