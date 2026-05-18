const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "kaay_nafaar",
  process.env.DB_USER || "user_admin",
  process.env.DB_PASSWORD || "password_secret",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("🐘 PostgreSQL connecté via Sequelize");
    
    if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
      await sequelize.sync({ alter: true });
      console.log("✅ Tables PostgreSQL synchronisées");
    }
  } catch (err) {
    console.error("❌ Erreur connexion PostgreSQL:", err.message);
    if (process.env.NODE_ENV === "test") {
      console.warn("⚠️ Mode test : pas de BDD, continuation...");
      return;
    }
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };