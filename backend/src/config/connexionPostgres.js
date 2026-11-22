/**
 * Paramètres de connexion PostgreSQL partagés (Sequelize + vector store LangChain).
 *
 * Deux modes :
 *  - DATABASE_URL (hébergement géré : Supabase, Neon, Render…) avec SSL ;
 *  - variables DB_HOST / DB_USER / … (docker-compose local ou VPS).
 */

const dns = require("dns").promises;

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

/**
 * Le pooler partagé de Supabase s'appelle aws-0-<région> ou aws-1-<région>
 * selon l'ancienneté du projet : on bascule sur l'autre nom s'il est introuvable.
 */
const resoudreHotePooler = async () => {
  const p = parametres();
  const m = /^aws-(\d)-(.+\.pooler\.supabase\.com)$/.exec(p.host);
  if (!m) return;
  try {
    await dns.lookup(p.host);
  } catch {
    const alternatif = `aws-${m[1] === "0" ? "1" : "0"}-${m[2]}`;
    try {
      await dns.lookup(alternatif);
      const url = new URL(process.env.DATABASE_URL);
      url.hostname = alternatif;
      process.env.DATABASE_URL = url.toString();
      console.warn(`ℹ️ Pooler ${p.host} introuvable, utilisation de ${alternatif}`);
    } catch {
      /* aucun des deux ne répond : l'erreur de connexion sera remontée normalement */
    }
  }
};

const postgresConfigure = () => Boolean(process.env.DATABASE_URL || process.env.DB_HOST);

module.exports = { parametres, optionsSSL, resoudreHotePooler, postgresConfigure };
