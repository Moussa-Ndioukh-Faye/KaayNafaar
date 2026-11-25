/**
 * Migrations PostgreSQL idempotentes, exécutées au démarrage après sequelize.sync().
 *
 * En production, sync() crée les tables manquantes mais n'ajoute pas de colonnes aux
 * tables existantes (DB_SYNC=false, pour ne jamais altérer les données en silence).
 * Chaque ajout de colonne est donc écrit ici, explicitement, avec IF NOT EXISTS.
 */

const MIGRATIONS = [
  {
    id: "2026-11-25-carnets-guide-reglages",
    sql: [
      "ALTER TABLE carnets ADD COLUMN IF NOT EXISTS guide json DEFAULT '{}'::json",
      "ALTER TABLE carnets ADD COLUMN IF NOT EXISTS reglages json DEFAULT '{}'::json",
    ],
  },
];

const executerMigrations = async (sequelize) => {
  for (const migration of MIGRATIONS) {
    try {
      for (const sql of migration.sql) await sequelize.query(sql);
    } catch (err) {
      console.error(`❌ Migration ${migration.id} :`, err.message.split("\n")[0]);
      throw err;
    }
  }
};

module.exports = { executerMigrations, MIGRATIONS };
