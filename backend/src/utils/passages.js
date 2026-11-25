/**
 * Recherche de passages dans les cours d'un étudiant (RAG), avec citations [n].
 *
 * Étapes :
 *  1. Deux recherches en parallèle, toujours limitées à l'étudiant (et au carnet) :
 *     - sémantique : distance cosinus pgvector (index HNSW en demi-précision) ;
 *     - mots-clés : plein texte français, mots reliés par OU (et non ET : une question
 *       en langage naturel ne contient presque jamais tous ses mots dans un passage).
 *  2. Fusion RRF pondérée (le sens compte un peu plus que les mots exacts).
 *  3. Diversité : quand le carnet a plusieurs sources, une seule ne monopolise pas la réponse.
 *  4. Passages voisins d'un même cours fusionnés (contexte continu, moins de coupures).
 *  5. Numérotation [n], avec page et section pour la citation.
 */

const { sequelize } = require("../config/database");
const { obtenirEmbedding } = require("./aiPro");
const { DIMENSIONS } = require("./indexation");

const K_RRF = 60;
const POIDS = { vecteurs: 1, motsCles: 0.8 };
const CANDIDATS_MIN = 24;
const MOTS_MAX = 12;

const filtreCours = (coursIds) =>
  Array.isArray(coursIds) && coursIds.length ? "AND metadata->>'coursId' IN (:coursIds)" : "";

const lireMeta = (m) => (typeof m === "string" ? JSON.parse(m) : m || {});

/** Requête plein texte « mot1 | mot2 | … » sûre (lettres et chiffres uniquement) */
const requeteMotsCles = (question) => {
  const mots = String(question)
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((m) => m.length > 2);
  return [...new Set(mots)].slice(0, MOTS_MAX).join(" | ");
};

const parVecteurs = async (question, userId, coursIds, limite) => {
  const vecteur = await obtenirEmbedding(question);
  if (!Array.isArray(vecteur) || !vecteur.length) return [];
  const replacements = {
    userId: String(userId),
    coursIds: (coursIds || []).map(String),
    vecteur: `[${vecteur.join(",")}]`,
    limite,
  };
  // Même expression que l'index HNSW (halfvec) pour qu'il soit utilisé ;
  // repli sur la distance exacte si la dimension ne correspond pas.
  const avecIndex = vecteur.length === DIMENSIONS;
  const distance = avecIndex
    ? `embedding::halfvec(${DIMENSIONS}) <=> CAST(:vecteur AS halfvec(${DIMENSIONS}))`
    : "embedding <=> CAST(:vecteur AS vector)";
  const sql = `SELECT id, text, metadata
       FROM course_embeddings
      WHERE metadata->>'utilisateurId' = :userId ${filtreCours(coursIds)}
      ORDER BY ${distance}
      LIMIT :limite`;
  if (!avecIndex) return sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

  // Index approximatif + filtre par étudiant : sans balayage itératif (pgvector ≥ 0.8),
  // l'index peut rendre moins de résultats que demandé une fois le filtre appliqué.
  return sequelize.transaction(async (transaction) => {
    await sequelize.query("SET LOCAL hnsw.iterative_scan = relaxed_order", { transaction });
    await sequelize.query("SET LOCAL hnsw.ef_search = 100", { transaction });
    return sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT, transaction });
  });
};

const parMotsCles = async (question, userId, coursIds, limite) => {
  const requete = requeteMotsCles(question);
  if (!requete) return [];
  return sequelize.query(
    `SELECT id, text, metadata
       FROM course_embeddings
      WHERE metadata->>'utilisateurId' = :userId ${filtreCours(coursIds)}
        AND to_tsvector('french', text) @@ to_tsquery('french', :requete)
      ORDER BY ts_rank_cd(to_tsvector('french', text), to_tsquery('french', :requete)) DESC
      LIMIT :limite`,
    {
      replacements: { userId: String(userId), coursIds: (coursIds || []).map(String), requete, limite },
      type: sequelize.QueryTypes.SELECT,
    }
  );
};

/** Fusion RRF pondérée de plusieurs classements */
const fusionner = (classements) => {
  const fusion = new Map();
  for (const { liste, poids } of classements) {
    liste.forEach((r, rang) => {
      const meta = lireMeta(r.metadata);
      const cle = r.id || `${meta.coursId}:${meta.ordre}:${r.text.slice(0, 80)}`;
      const item = fusion.get(cle) || { texte: r.text, meta, score: 0 };
      item.score += poids / (K_RRF + rang + 1);
      fusion.set(cle, item);
    });
  }
  return [...fusion.values()].sort((a, b) => b.score - a.score);
};

/** Évite qu'une seule source occupe tous les passages quand il y en a plusieurs */
const diversifier = (classes, k) => {
  const nbSources = new Set(classes.map((p) => p.meta.coursId)).size;
  if (nbSources <= 1) return classes.slice(0, k);
  const maxParSource = Math.max(2, Math.ceil(k * 0.6));
  const parSource = new Map();
  const retenus = [];
  const reserve = [];
  for (const p of classes) {
    const n = parSource.get(p.meta.coursId) || 0;
    if (n < maxParSource) {
      parSource.set(p.meta.coursId, n + 1);
      retenus.push(p);
    } else reserve.push(p);
    if (retenus.length === k) break;
  }
  return retenus.concat(reserve).slice(0, k);
};

/** Fusionne les passages consécutifs d'un même cours (ordre n et n+1) */
const fusionnerVoisins = (passages) => {
  const resultat = [];
  for (const p of passages) {
    const voisin = resultat.find(
      (q) =>
        q.meta.coursId === p.meta.coursId &&
        Number.isInteger(q.meta.ordre) &&
        Number.isInteger(p.meta.ordre) &&
        Math.abs(q.meta.ordre - p.meta.ordre) === 1
    );
    if (voisin && voisin.texte.length + p.texte.length < 3200) {
      const avant = p.meta.ordre < voisin.meta.ordre;
      voisin.texte = avant ? `${p.texte}\n${voisin.texte}` : `${voisin.texte}\n${p.texte}`;
      voisin.meta = {
        ...voisin.meta,
        ordre: Math.min(voisin.meta.ordre, p.meta.ordre),
        page: Math.min(voisin.meta.page || Infinity, p.meta.page || Infinity),
        pageFin: Math.max(voisin.meta.pageFin || 0, p.meta.pageFin || 0),
      };
      if (!Number.isFinite(voisin.meta.page)) voisin.meta.page = null;
    } else resultat.push({ ...p, meta: { ...p.meta } });
  }
  return resultat;
};

/** « p. 4 », « p. 4–6 » ou rien */
const libellePage = (meta) => {
  const debut = Number(meta.page) || null;
  const fin = Number(meta.pageFin) || debut;
  if (!debut || (meta.total === 1 && debut === 1 && fin === 1)) return null;
  return fin && fin !== debut ? `p. ${debut}–${fin}` : `p. ${debut}`;
};

/**
 * @param {{ question: string, questionsAlternatives?: string[], userId: number, coursIds?: number[]|null, k?: number }} options
 * @returns {Promise<Array<{ n, coursId, titre, texte, page, section }>>}
 */
const rechercherPassages = async ({ question, questionsAlternatives = [], userId, coursIds = null, k = 8 }) => {
  if (Array.isArray(coursIds) && coursIds.length === 0) return [];
  const candidats = Math.max(CANDIDATS_MIN, k * 3);
  const formulations = [question, ...questionsAlternatives.filter((q) => q && q !== question)].slice(0, 3);

  const journaliser = (type) => (e) => {
    console.error(`Passages (${type}):`, e.message);
    return [];
  };
  const resultats = await Promise.all(
    formulations.flatMap((q) => [
      parVecteurs(q, userId, coursIds, candidats).catch(journaliser("vecteurs")),
      parMotsCles(q, userId, coursIds, candidats).catch(journaliser("mots-clés")),
    ])
  );
  const classements = resultats.map((liste, i) => ({
    liste,
    poids: (i % 2 === 0 ? POIDS.vecteurs : POIDS.motsCles) * (i < 2 ? 1 : 0.7),
  }));

  const choisis = fusionnerVoisins(diversifier(fusionner(classements), k));
  return choisis.map((p, i) => ({
    n: i + 1,
    coursId: Number(p.meta.coursId) || null,
    titre: p.meta.titre || "Cours",
    page: libellePage(p.meta),
    section: p.meta.section || null,
    texte: p.texte.trim(),
  }));
};

/** Bloc de contexte numéroté à donner à l'IA */
const formaterPassages = (passages) =>
  passages
    .map((p) => {
      const ou = [p.titre && `« ${p.titre} »`, p.page, p.section && `section : ${p.section}`].filter(Boolean).join(", ");
      return `[${p.n}] (source : ${ou})\n${p.texte}`;
    })
    .join("\n\n");

module.exports = {
  rechercherPassages,
  formaterPassages,
  requeteMotsCles,
  fusionner,
  diversifier,
  fusionnerVoisins,
  libellePage,
};
