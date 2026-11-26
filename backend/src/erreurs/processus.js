/**
 * Dernier filet : erreurs qui échappent à Express (minuteries, promesses oubliées).
 *  - Promesse rejetée non gérée : journalisée, le serveur continue (aucune requête n'est perdue).
 *  - Exception non interceptée : état du processus incertain → journalisée, puis arrêt propre ;
 *    Render relance le service aussitôt.
 */

let installe = false;

const installerGardiens = ({ arreter } = {}) => {
  if (installe) return;
  installe = true;

  process.on("unhandledRejection", (raison) => {
    console.error("💥 Promesse rejetée non gérée :", raison instanceof Error ? raison.stack : raison);
  });

  process.on("uncaughtException", (err) => {
    console.error("💥 Exception non interceptée, arrêt du serveur :", err.stack || err);
    const sortir = () => process.exit(1);
    // Laisser 5 s aux requêtes en cours pour se terminer, pas plus
    setTimeout(sortir, 5000).unref();
    Promise.resolve(arreter?.("uncaughtException")).catch(() => {}).finally(sortir);
  });
};

module.exports = { installerGardiens };
