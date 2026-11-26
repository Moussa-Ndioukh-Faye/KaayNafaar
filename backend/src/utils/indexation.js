/**
 * Indexation des cours pour la recherche (RAG) — Kaay Nafaar
 *
 * Par rapport à l'ancienne indexation (blocs de 1 000 caractères via PGVectorStore) :
 *  - découpage page par page, en respectant titres et paragraphes ;
 *  - petites diapositives regroupées (pas de passages de 30 caractères) ;
 *  - chaque passage garde sa page, sa section et sa position → citations « p. 4 »
 *    et ajout des passages voisins à la recherche ;
 *  - l'embedding est calculé sur « Cours — Section + texte » (recherche contextuelle) ;
 *  - réindexer un cours remplace ses anciens passages (plus de doublons) ;
 *  - index HNSW (vecteurs), GIN (plein texte français) et B-tree (filtres).
 */

const crypto = require("crypto");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { sequelize } = require("../config/database");
const { embedderTextes, invaliderCacheRAG } = require("./aiPro");
const { decouperParMarqueurs } = require("./lectureDocument");

const TAILLE_PASSAGE = 1100;
const CHEVAUCHEMENT = 160;
const PAGE_COURTE = 450; // diapositives : on regroupe jusqu'à ~ cette taille
const LOT_EMBEDDINGS = 50;
const PAUSE_ENTRE_LOTS_MS = 1500;
const PASSAGES_MAX = 800; // ~ un manuel de 300 pages

const decoupeur = new RecursiveCharacterTextSplitter({
  chunkSize: TAILLE_PASSAGE,
  chunkOverlap: CHEVAUCHEMENT,
  separators: ["\n# ", "\n## ", "\n### ", "\n\n", "\n", ". ", "; ", " ", ""],
});

const nettoyer = (t) =>
  String(t || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** Titre de section : titre Markdown, sinon première ligne courte d'une diapositive */
const titreDeSection = (texte) => {
  const md = texte.match(/^#{1,3}\s+(.{2,100})$/m);
  if (md) return md[1].trim();
  const premiere = texte.split("\n")[0].trim();
  return premiere.length >= 3 && premiere.length <= 80 && !/[.;:,]$/.test(premiere) ? premiere : null;
};

/**
 * Pages → passages. Les pages trop courtes (diapositives) sont regroupées.
 * @returns {Promise<Array<{ texte, page, pageFin, section, ordre }>>}
 */
const decouperEnPassages = async (pages) => {
  const blocs = [];
  let tampon = null;
  for (const p of pages) {
    const texte = nettoyer(p.texte);
    if (!texte) continue;
    if (texte.length < PAGE_COURTE) {
      if (!tampon) tampon = { texte, page: p.n, pageFin: p.n, section: titreDeSection(texte) };
      else {
        tampon.texte += `\n\n${texte}`;
        tampon.pageFin = p.n;
      }
      if (tampon.texte.length >= PAGE_COURTE) {
        blocs.push(tampon);
        tampon = null;
      }
      continue;
    }
    if (tampon) {
      blocs.push(tampon);
      tampon = null;
    }
    blocs.push({ texte, page: p.n, pageFin: p.n, section: titreDeSection(texte) });
  }
  if (tampon) blocs.push(tampon);

  const passages = [];
  let sectionCourante = null;
  for (const bloc of blocs) {
    const morceaux = bloc.texte.length > TAILLE_PASSAGE ? await decoupeur.splitText(bloc.texte) : [bloc.texte];
    for (const m of morceaux) {
      const texte = nettoyer(m);
      if (texte.length < 25) continue;
      sectionCourante = titreDeSection(texte) || bloc.section || sectionCourante;
      passages.push({ texte, page: bloc.page, pageFin: bloc.pageFin, section: sectionCourante, ordre: passages.length });
      if (passages.length >= PASSAGES_MAX) return passages;
    }
  }
  return passages;
};

/** Supprime tous les passages d'un cours (suppression ou réindexation) */
const supprimerIndexCours = async (coursId, utilisateurId) => {
  await sequelize.query(
    `DELETE FROM course_embeddings
      WHERE metadata->>'coursId' = :coursId AND metadata->>'utilisateurId' = :uid`,
    { replacements: { coursId: String(coursId), uid: String(utilisateurId) } }
  );
  await invaliderCacheRAG(utilisateurId);
};

/**
 * Indexe un cours : remplace ses anciens passages par les nouveaux.
 * @param {{ coursId, utilisateurId, titre, pages?: Array<{n, texte}>, texte?: string }} cours
 * @returns {Promise<number>} nombre de passages indexés
 */
const indexerDocument = async ({ coursId, utilisateurId, titre, pages, texte }) => {
  const listePages = pages?.length ? pages : decouperParMarqueurs(texte || "");
  const passages = await decouperEnPassages(listePages);
  if (!passages.length) return 0;

  // Texte embarqué = contexte + passage : « de quel cours, de quelle partie parle-t-on ? »
  const aEmbarquer = passages.map((p) => `Cours : ${titre}${p.section ? ` — ${p.section}` : ""}\n\n${p.texte}`);
  const vecteurs = [];
  for (let i = 0; i < aEmbarquer.length; i += LOT_EMBEDDINGS) {
    // Petite pause entre les lots : le quota gratuit de Gemini est compté par minute
    if (i > 0 && process.env.NODE_ENV !== "test") await new Promise((r) => setTimeout(r, PAUSE_ENTRE_LOTS_MS));
    vecteurs.push(...(await embedderTextes(aEmbarquer.slice(i, i + LOT_EMBEDDINGS))));
  }

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `DELETE FROM course_embeddings
        WHERE metadata->>'coursId' = :coursId AND metadata->>'utilisateurId' = :uid`,
      { replacements: { coursId: String(coursId), uid: String(utilisateurId) }, transaction }
    );
    for (let i = 0; i < passages.length; i += 1) {
      const p = passages[i];
      const meta = {
        coursId: Number(coursId),
        utilisateurId: Number(utilisateurId),
        titre,
        page: p.page,
        pageFin: p.pageFin,
        section: p.section,
        ordre: p.ordre,
        total: passages.length,
      };
      await sequelize.query(
        `INSERT INTO course_embeddings (id, text, metadata, embedding)
         VALUES (:id, :texte, CAST(:meta AS jsonb), CAST(:vecteur AS vector))`,
        {
          replacements: {
            id: crypto.randomUUID(),
            texte: p.texte,
            meta: JSON.stringify(meta),
            vecteur: `[${vecteurs[i].join(",")}]`,
          },
          transaction,
        }
      );
    }
  });

  await invaliderCacheRAG(utilisateurId);
  return passages.length;
};

/**
 * Index de recherche, créés au démarrage s'ils manquent (idempotent).
 * Les embeddings Gemini ont 3 072 dimensions : au-delà de 2 000, pgvector
 * indexe en demi-précision (halfvec), ce qui garde la qualité et divise la mémoire par 2.
 */
const DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || "3072", 10);

const preparerIndexRAG = async () => {
  const requetes = [
    `CREATE TABLE IF NOT EXISTS course_embeddings (
       id uuid PRIMARY KEY, text text, metadata jsonb, embedding vector)`,
    `CREATE INDEX IF NOT EXISTS course_embeddings_utilisateur_idx ON course_embeddings ((metadata->>'utilisateurId'))`,
    `CREATE INDEX IF NOT EXISTS course_embeddings_cours_idx ON course_embeddings ((metadata->>'coursId'))`,
    `CREATE INDEX IF NOT EXISTS course_embeddings_fts_idx ON course_embeddings USING gin (to_tsvector('french', text))`,
    `CREATE INDEX IF NOT EXISTS course_embeddings_hnsw_idx ON course_embeddings
       USING hnsw ((embedding::halfvec(${DIMENSIONS})) halfvec_cosine_ops)`,
  ];
  for (const sql of requetes) {
    try {
      await sequelize.query(sql);
    } catch (err) {
      console.warn("[RAG] Index non créé :", err.message.split("\n")[0]);
    }
  }
};

module.exports = {
  decouperEnPassages,
  indexerDocument,
  supprimerIndexCours,
  preparerIndexRAG,
  titreDeSection,
  DIMENSIONS,
};
