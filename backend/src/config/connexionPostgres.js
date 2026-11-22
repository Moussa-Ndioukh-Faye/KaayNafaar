/**
 * Paramètres de connexion PostgreSQL partagés (Sequelize + vector store LangChain).
 *
 * Deux modes :
 *  - DATABASE_URL (hébergement géré : Supabase, Neon, Render…) avec SSL ;
 *  - variables DB_HOST / DB_USER / … (docker-compose local ou VPS).
 */

const avecSSL = () => {
  if (process.env.DB_SSL === "false") return false;
  if (process.env.DB_SSL === "true") return true;
  return Boolean(process.env.DATABASE_URL);
};

// Options SSL : chiffrement obligatoire. Les poolers gérés utilisent des certificats
// d'autorités intermédiaires souvent absentes du conteneur, d'où rejectUnauthorized
// désactivable via DB_SSL_STRICT=false (valeur par défaut pour DATABASE_URL).
const optionsSSL = () =>
  avecSSL() ? { require: true, rejectUnauthorized: process.env.DB_SSL_STRICT === "true" } : false;

const decouperUrl = (url) => {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "5432", 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres"),
  };
};

const parametres = () => {
  if (process.env.DATABASE_URL) return decouperUrl(process.env.DATABASE_URL);
  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USER || "user_admin",
    password: process.env.DB_PASSWORD || "password_secret",
    database: process.env.DB_NAME || "kaay_nafaar_v2",
  };
};

const postgresConfigure = () => Boolean(process.env.DATABASE_URL || process.env.DB_HOST);

module.exports = { parametres, optionsSSL, postgresConfigure };
