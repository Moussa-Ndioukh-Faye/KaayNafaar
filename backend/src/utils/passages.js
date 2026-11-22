/**
 * Recherche de passages dans les cours d'un étudiant, pour un chat avec citations.
 *
 * Recherche hybride (vecteurs + mots-clés, fusion RRF) limitée :
 *  - aux cours de l'étudiant (jamais ceux d'un autre),
 *  - et, pour un carnet, aux seuls cours de ce carnet.
 * Chaque passage reçoit un numéro [n] que l'IA doit citer.
 */

const { sequelize } = require("../config/database");
const { obtenirEmbedding } = require("./aiPro");

const K_RRF = 60;

const filtreCours = (coursIds) =>
  Array.isArray(coursIds) && coursIds.length ? "AND metadata->>'coursId' IN (:coursIds)" : "";

const parVecteurs = async (question, userId, coursIds, limite) => {
  const vecteur = await obtenirEmbedding(question);
  if (!Array.isArray(vecteur) || !vecteur.length) return [];
  return sequelize.query(
    `SELECT text, metadata
       FROM course_embeddings
      WHERE metadata->>'utilisateurId' = :userId ${filtreCours(coursIds)}
      ORDER BY embedding <=> CAST(:vecteur AS vector)
      LIMIT :limite`,
    {
      replacements: { userId: String(userId), coursIds: (coursIds || []).map(String), vecteur: `[${vecteur.join(",")}]`, limite },
      type: sequelize.QueryTypes.SELECT,
    }
  );
};

const parMotsCles = async (question, userId, coursIds, limite) => {
  const mots = question.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  if (mots.length < 3) return [];
  return sequelize.query(
    `SELECT text, metadata
       FROM course_embeddings
      WHERE metadata->>'utilisateurId' = :userId ${filtreCours(coursIds)}
        AND to_tsvector('french', text) @@ plainto_tsquery('french', :mots)
      ORDER BY ts_rank(to_tsvector('french', text), plainto_tsquery('french', :mots)) DESC
      LIMIT :limite`,
    {
      replacements: { userId: String(userId), coursIds: (coursIds || []).map(String), mots, limite },
      type: sequelize.QueryTypes.SELECT,
    }
  );
};

/**
 * @returns {Promise<Array<{ n: number, coursId: number, titre: string, texte: string }>>}
 */
const rechercherPassages = async ({ question, userId, coursIds = null, k = 6 }) => {
  if (Array.isArray(coursIds) && coursIds.length === 0) return [];

  const [vecteurs, motsCles] = await Promise.all([
    parVecteurs(question, userId, coursIds, k * 2).catch((e) => {
      console.error("Passages (vecteurs):", e.message);
      return [];
    }),
    parMotsCles(question, userId, coursIds, k * 2).catch((e) => {
      console.error("Passages (mots-clés):", e.message);
      return [];
    }),
  ]);

  const fusion = new Map();
  const noter = (liste) =>
    liste.forEach((r, i) => {
      const cle = r.text.slice(0, 160);
      const meta = typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata || {};
      const item = fusion.get(cle) || { texte: r.text, meta, score: 0 };
      item.score += 1 / (K_RRF + i + 1);
      fusion.set(cle, item);
    });
  noter(vecteurs);
  noter(motsCles);

  return [...fusion.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((p, i) => ({
      n: i + 1,
      coursId: Number(p.meta.coursId) || null,
      titre: p.meta.titre || "Cours",
      texte: p.texte.trim(),
    }));
};

/** Bloc de contexte numéroté à donner à l'IA */
const formaterPassages = (passages) =>
  passages.map((p) => `[${p.n}] (source : « ${p.titre} »)\n${p.texte}`).join("\n\n");

module.exports = { rechercherPassages, formaterPassages };
