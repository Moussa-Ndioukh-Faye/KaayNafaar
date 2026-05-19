const { Sequelize } = require("sequelize");
const path = require("path");

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

  // Tentative Postgres
  return new Sequelize(
    process.env.DB_NAME || "kaay_nafaar_v2",
    process.env.DB_USER || "user_admin",
    process.env.DB_PASSWORD || "password_secret",
    {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      dialect: "postgres",
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      define: { timestamps: true, underscored: true },
    }
  );
};

// Premier jet
dbConfig.sequelize = initSequelize(!process.env.DB_HOST);

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
  } catch (err) {
    console.error("❌ Échec de la connexion initiale:", err.message);
    
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
