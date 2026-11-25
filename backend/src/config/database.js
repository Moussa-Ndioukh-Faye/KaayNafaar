const { Sequelize } = require("sequelize");
const path = require("path");
const { parametres, optionsSSL, postgresConfigure } = require("./connexionPostgres");

const dbConfig = {
  sequelize: null
};

// Initialisation de l'instance
const initSequelize = (useSqlite = false) => {
  if (useSqlite) {
    return new Sequelize({
      dialect: "sqlite",
      storage: path.join(__dirname, "../../database.sqlite"),
      logging: false,
      define: { timestamps: true, underscored: true },
    });
  }

  // Postgres : DATABASE_URL (hébergement géré, SSL) ou variables DB_*
  const p = parametres();
  const ssl = optionsSSL();
  return new Sequelize(p.database, p.user, p.password, {
    host: p.host,
    port: p.port,
    dialect: "postgres",
    logging: false,
    dialectOptions: ssl ? { ssl } : {},
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true },
  });
};

// Premier jet
dbConfig.sequelize = initSequelize(!postgresConfigure());

const connectDB = async () => {
  try {
    await dbConfig.sequelize.authenticate();
    console.log(`🐘 Base de données connectée (${dbConfig.sequelize.getDialect()})`);

    const syncMode = process.env.DB_SYNC || (process.env.NODE_ENV === "production" ? "false" : "alter");
    if (syncMode === "alter") {
      await dbConfig.sequelize.sync({ alter: true });
      console.log("✅ Schéma de base de données à jour (alter).");
    } else if (syncMode === "force") {
      await dbConfig.sequelize.sync({ force: true });
      console.log("✅ Schéma de base de données recréé (force).");
    } else {
      await dbConfig.sequelize.sync();
      console.log("✅ Schéma vérifié (sync sans alter).");
    }

    if (dbConfig.sequelize.getDialect() === "postgres") {
      // Migrations et index : une erreur ici est signalée mais ne doit JAMAIS faire
      // basculer sur SQLite (le site tournerait sans les données de production).
      try {
        await require("./migrations").executerMigrations(dbConfig.sequelize);
        await require("../utils/indexation").preparerIndexRAG();
        console.log("✅ Migrations et index de recherche à jour.");
      } catch (err) {
        console.error("❌ Migrations ou index non appliqués, à corriger :", err.message);
      }
    }
  } catch (err) {
    console.error("❌ Échec de la connexion initiale:", err.message);

    // Les modèles sont liés à l'instance Sequelize créée au démarrage : on ne la recrée pas.
    // Pooler Supabase : si le projet est introuvable (« tenant/user not found »),
    // vérifier le nom du pooler (aws-0 ou aws-1) dans le bouton « Connect » de Supabase.
    if (/tenant\/user/i.test(err.message)) {
      console.error("ℹ️ Vérifie le nom du pooler Supabase (aws-0-… ou aws-1-…) dans DATABASE_URL.");
    }
    
    if (dbConfig.sequelize.getDialect() === "postgres") {
      console.warn("⚠️ Basculement d'urgence sur SQLite (Mode Dégradé)...");
      dbConfig.sequelize = initSequelize(true);
      await dbConfig.sequelize.authenticate();
      await dbConfig.sequelize.sync({ alter: true });
      console.log("✅ Serveur démarré en Mode Dégradé (SQLite).");
    } else {
      console.error("❌ Impossible de démarrer même avec SQLite.");
      process.exit(1);
    }
  }
};

// Export de l'objet avec un getter pour que la référence soit toujours à jour
module.exports = {
  get sequelize() {
    return dbConfig.sequelize;
  },
  connectDB
};
