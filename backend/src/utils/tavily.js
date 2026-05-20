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
  if (!apiKey) return [];

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn("[TAVILY] Error:", errorData);
      return [];
    }

    const data = await response.json();

    if (!data || !data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      source: "web"
    }));
  } catch (err) {
    console.warn("[TAVILY] Exception:", err.message);
    return [];
  }
};

module.exports = { webSearch };
