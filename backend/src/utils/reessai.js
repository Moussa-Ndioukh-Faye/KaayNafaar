/**
 * Nouvelles tentatives avec attente progressive, pour les appels aux services d'IA
 * (embeddings, lecture de documents) qui répondent parfois 429 (quota) ou 503 (surcharge).
 */

const { estSaturation } = require("./aiProviderManager");

const ATTENTE_MAX_MS = 15000;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const statutDe = (err) => err?.status ?? err?.response?.status ?? (/\b(429|500|502|503|504)\b/.exec(err?.message || "") || [])[1];

/** Faut-il réessayer ? Saturation, quota, coupure réseau ou délai dépassé */
const estPassager = (err) => {
  const statut = Number(statutDe(err));
  return (
    [429, 500, 502, 503, 504].includes(statut) ||
    estSaturation(err) ||
    /timeout|timed out|aborted|econnreset|socket|fetch failed|resource.?exhausted/i.test(`${err?.name || ""} ${err?.message || ""}`)
  );
};

/**
 * @param {() => Promise<T>} fn
 * @param {{ tentatives?: number, base?: number, quoi?: string }} options
 * @returns {Promise<T>}
 */
const avecReessais = async (fn, { tentatives = 4, base = 1500, quoi = "appel IA" } = {}) => {
  let derniere;
  for (let i = 0; i < tentatives; i += 1) {
    try {
      return await fn();
    } catch (err) {
      derniere = err;
      if (!estPassager(err) || i === tentatives - 1) break;
      // REESSAI_ECHELLE=0 dans les tests : mêmes nouvelles tentatives, sans attendre
      const echelle = Number(process.env.REESSAI_ECHELLE ?? 1);
      const attente = echelle * Math.min(ATTENTE_MAX_MS, base * 2 ** i + Math.floor(Math.random() * 400));
      if (process.env.NODE_ENV !== "test") console.warn(`⏳ ${quoi} : ${statutDe(err) || "erreur passagère"}, nouvel essai dans ${Math.round(attente / 1000)} s`);
      await attendre(attente);
    }
  }
  throw derniere;
};

module.exports = { avecReessais, estPassager };
