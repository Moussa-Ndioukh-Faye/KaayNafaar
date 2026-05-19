/**
 * Client de Recherche Web (Tavily API)
 * Optimisé pour le RAG : renvoie du contenu propre et contextuel.
 */

const TAVILY_API_URL = "https://api.tavily.com/search";

/**
 * Effectuer une recherche web via Tavily
 * @param {string} query - La question ou les mots-clés
 * @param {object} options - Options de recherche (limit, search_depth, etc.)
 */
const webSearch = async (query, options = {}) => {
  const apiKey = process.env.TAVILY_API_KEY;
  console.log(`📡 [TAVILY] Recherche: "${query}" (API Key: ${apiKey ? "OK" : "MANQUANTE"})`);
  
  if (!apiKey) {
    console.warn("⚠️ Tavily API Key manquante. Recherche web désactivée.");
    return [];
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: options.depth || "advanced",
        include_answer: false,
        include_images: false,
        include_raw_content: false,
        max_results: options.limit || 5,
      }),
      signal: AbortSignal.timeout(15000)
    });

    console.log(`📡 [TAVILY] HTTP Status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ [TAVILY] Error details:`, errorData);
      return [];
    }

    const data = await response.json();
    console.log(`✅ [TAVILY] Résultats reçus: ${data.results?.length || 0}`);

    if (!data || !data.results || data.results.length === 0) {
      console.warn("⚠️ [TAVILY] Aucun résultat trouvé pour cette requête.");
      return [];
    }

    // Log le titre du premier résultat pour vérifier la fraîcheur
    if (data.results[0]) {
      console.log(`📄 [TAVILY] Premier résultat: "${data.results[0].title}"`);
    }

    return data.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      source: "web"
    }));
  } catch (err) {
    console.error("❌ [TAVILY] Exception:", err.message);
    return [];
  }
};

module.exports = { webSearch };
