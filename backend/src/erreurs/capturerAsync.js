/**
 * Express 4 ne transmet pas au gestionnaire d'erreurs une promesse rejetée par un
 * middleware ou un contrôleur `async` : la requête reste sans réponse et, depuis Node 15,
 * le rejet non géré peut arrêter le serveur. Ce correctif (équivalent de express-async-errors)
 * fait suivre toute promesse rejetée à `next(err)`, donc au gestionnaire global.
 * À charger une fois, avant la déclaration des routes.
 */

const Layer = require("express/lib/router/layer");

if (!Layer.prototype.__capturerAsync) {
  const original = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function handle(req, res, next) {
    const fn = this.handle;
    if (fn.length > 3) return original.call(this, req, res, next); // gestionnaire d'erreurs : inchangé
    try {
      const resultat = fn(req, res, next);
      if (resultat && typeof resultat.catch === "function") resultat.catch((err) => next(err || new Error("Erreur inconnue")));
    } catch (err) {
      next(err);
    }
    return undefined;
  };
  Layer.prototype.__capturerAsync = true;
}
