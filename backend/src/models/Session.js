const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Session de connexion (OWASP ASVS V3) : une ligne par appareil connecté.
 * Le JWT porte l'identifiant de la session (« sid ») ; la session peut être
 * révoquée côté serveur (déconnexion à distance, changement de mot de passe).
 *
 * Minimisation des données : on garde un libellé d'appareil (« Safari sur iPhone »),
 * jamais l'en-tête User-Agent complet, et une adresse IP tronquée.
 */
const Session = sequelize.define(
  "Session",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    utilisateurId: { type: DataTypes.INTEGER, allowNull: false },
    appareil: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "Appareil inconnu" },
    typeAppareil: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "ordinateur" },
    ipTronquee: { type: DataTypes.STRING(48), allowNull: true },
    derniereActivite: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    expireLe: { type: DataTypes.DATE, allowNull: false },
    revoqueeLe: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "sessions_utilisateurs",
    indexes: [{ fields: ["utilisateur_id"] }],
  }
);

module.exports = Session;
