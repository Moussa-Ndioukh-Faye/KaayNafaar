/**
 * Rattrapage de l'indexation : un cours dont le texte a été lu mais dont l'indexation a échoué
 * (quota ou surcharge de Gemini) est réindexé automatiquement, sans que l'étudiant le réimporte.
 * Lancé quelques instants après le démarrage, puis toutes les 6 heures ; un cours à la fois.
 */

const { sequelize } = require("../config/database");
const { indexerCours } = require("./aiPro");

const PREMIER_PASSAGE_MS = 2 * 60 * 1000;
const INTERVALLE_MS = 6 * 60 * 60 * 1000;
const PAR_PASSAGE = 20;
const MIN_CARACTERES = 200; // en dessous : rien de lisible (ex. message « Aucun texte… »)

let enCours = false;

/** Cours avec du texte mais sans aucun passage indexé */
const coursNonIndexes = async (limite = PAR_PASSAGE) => {
  const [lignes] = await sequelize.query(
    `SELECT c.id, c.titre, c.contenu, c.utilisateur_id AS "utilisateurId"
       FROM courses c
      WHERE length(coalesce(c.contenu, '')) >= :min
        AND NOT EXISTS (
          SELECT 1 FROM course_embeddings e
           WHERE e.metadata->>'coursId' = c.id::text
             AND e.metadata->>'utilisateurId' = c.utilisateur_id::text)
      ORDER BY c.updated_at DESC
      LIMIT :limite`,
    { replacements: { min: MIN_CARACTERES, limite } }
  );
  return lignes;
};

const rattraper = async () => {
  if (enCours || sequelize.getDialect() !== "postgres") return { traites: 0, reussis: 0 };
  enCours = true;
  let reussis = 0;
  let traites = 0;
  try {
    const cours = await coursNonIndexes();
    for (const c of cours) {
      traites += 1;
      const ok = await indexerCours(c.contenu, { coursId: c.id, utilisateurId: c.utilisateurId, titre: c.titre });
      if (ok) reussis += 1;
      else break; // le service est encore saturé : on réessaiera au prochain passage
    }
    if (traites) console.log(`🔁 Rattrapage de l'indexation : ${reussis}/${traites} cours réindexé(s)`);
  } catch (err) {
    console.error("⚠️ Rattrapage de l'indexation :", err.message);
  } finally {
    enCours = false;
  }
  return { traites, reussis };
};

const demarrerRattrapage = () => {
  setTimeout(() => rattraper().catch(() => {}), PREMIER_PASSAGE_MS).unref();
  setInterval(() => rattraper().catch(() => {}), INTERVALLE_MS).unref();
};

module.exports = { rattraper, coursNonIndexes, demarrerRattrapage };
