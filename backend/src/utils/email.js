/**
 * Envoi d'emails transactionnels via l'API HTTP de Brevo.
 *
 * Pourquoi une API HTTP et pas SMTP : les services gratuits de Render bloquent
 * les ports SMTP sortants (25, 465, 587). L'API Brevo passe par HTTPS (443).
 *
 * Variables : BREVO_API_KEY, MAIL_FROM (adresse expéditrice vérifiée dans Brevo),
 * MAIL_FROM_NAME (optionnel), APP_URL (URL publique du frontend, optionnel).
 */

const crypto = require("crypto");

const DUREE_VALIDITE_MS = 24 * 60 * 60 * 1000; // 24 heures
const DUREE_REINITIALISATION_MS = 15 * 60 * 1000; // 15 minutes (OWASP Forgot Password)

/** La vérification est active si un fournisseur est configuré, ou forcée (tests, dev) */
const verificationEmailActive = () =>
  process.env.EMAIL_VERIFICATION === "false"
    ? false
    : Boolean(process.env.BREVO_API_KEY) || process.env.EMAIL_VERIFICATION === "true";

const urlApplication = () =>
  (process.env.APP_URL || (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0])
    .trim()
    .replace(/\/$/, "");

/** Jeton aléatoire envoyé par email ; seule son empreinte SHA-256 est stockée */
const genererJetonVerification = (dureeMs = DUREE_VALIDITE_MS) => {
  const jeton = crypto.randomBytes(32).toString("base64url");
  return {
    jeton,
    empreinte: hacherJeton(jeton),
    expire: new Date(Date.now() + dureeMs),
  };
};

const hacherJeton = (jeton) => crypto.createHash("sha256").update(String(jeton)).digest("hex");

const echapper = (texte) =>
  String(texte).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Gabarit commun aux emails transactionnels (HTML + texte brut) */
const gabarit = ({ nom, sujet, intro, bouton, lien, note }) => {
  const prenom = echapper(String(nom || "").split(" ")[0] || "");
  const texte =
    `Bonjour ${prenom},\n\n${intro}\n` +
    (lien ? `${lien}\n\n` : "\n") +
    `${note}\n\nL'équipe Kaay Nafaar`;
  const blocLien = lien
    ? `<p style="margin:0 0 28px">
            <a href="${lien}" style="display:inline-block;background:#0047db;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px">
              ${echapper(bouton)}
            </a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#5f6b84">Le bouton ne marche pas&nbsp;? Copie ce lien dans ton navigateur&nbsp;:</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${lien}" style="color:#0047db">${lien}</a></p>`
    : "";
  return {
    sujet,
    texte,
    html: `<!doctype html>
<html lang="fr">
<body style="margin:0;background:#f7f9fc;font-family:Arial,Helvetica,sans-serif;color:#0a1f4a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e1e7f0;border-radius:20px;overflow:hidden">
        <tr><td style="background:#0a1f4a;padding:24px 32px">
          <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff">Kaay <span style="color:#8aabff">Nafaar</span></p>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 12px;font-size:22px">Bonjour ${prenom},</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#354057">${echapper(intro)}</p>
          ${blocLien}
          <p style="margin:0;font-size:13px;color:#5f6b84">${echapper(note)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
};

const gabaritVerification = ({ nom, lien }) =>
  gabarit({
    nom,
    lien,
    sujet: "Confirme ton adresse email — Kaay Nafaar",
    intro: "Bienvenue sur Kaay Nafaar ! Pour activer ton compte, confirme ton adresse email.",
    bouton: "Confirmer mon email",
    note: "Ce lien est valable 24 heures. Si tu n'as pas créé de compte, ignore simplement cet email.",
  });

const gabaritReinitialisation = ({ nom, lien }) =>
  gabarit({
    nom,
    lien,
    sujet: "Réinitialise ton mot de passe — Kaay Nafaar",
    intro: "Tu as demandé à changer ton mot de passe. Clique sur le bouton pour en choisir un nouveau.",
    bouton: "Choisir un nouveau mot de passe",
    note:
      "Ce lien est valable 15 minutes et ne fonctionne qu'une fois. " +
      "Si tu n'es pas à l'origine de cette demande, ignore cet email : ton mot de passe ne change pas.",
  });

const gabaritMotDePasseModifie = ({ nom }) =>
  gabarit({
    nom,
    sujet: "Ton mot de passe a été modifié — Kaay Nafaar",
    intro: "Le mot de passe de ton compte Kaay Nafaar vient d'être modifié. Toutes tes sessions ouvertes ont été déconnectées.",
    note: "Si ce n'est pas toi, utilise tout de suite « Mot de passe oublié » sur la page de connexion pour reprendre la main sur ton compte.",
  });

/** Envoie un email ; sans fournisseur configuré, l'affiche dans les logs (développement) */
const envoyerEmail = async ({ destinataire, nom, sujet, html, texte }) => {
  if (!process.env.BREVO_API_KEY) {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[Email non envoyé — BREVO_API_KEY absente] À : ${destinataire} | ${sujet}\n${texte}`);
    }
    return { envoye: false };
  }

  const reponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || "Kaay Nafaar", email: process.env.MAIL_FROM },
      to: [{ email: destinataire, name: nom || destinataire }],
      subject: sujet,
      htmlContent: html,
      textContent: texte,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!reponse.ok) {
    const detail = await reponse.text().catch(() => "");
    throw new Error(`Brevo ${reponse.status} : ${detail.slice(0, 200)}`);
  }
  return { envoye: true };
};

/** Génère un nouveau jeton pour l'utilisateur, l'enregistre et envoie l'email */
const envoyerVerification = async (utilisateur) => {
  const { jeton, empreinte, expire } = genererJetonVerification();
  await utilisateur.update({ jetonVerification: empreinte, jetonVerificationExpire: expire });

  const lien = `${urlApplication()}/verifier-email?token=${encodeURIComponent(jeton)}`;
  const { sujet, html, texte } = gabaritVerification({ nom: utilisateur.nom, lien });
  return envoyerEmail({ destinataire: utilisateur.email, nom: utilisateur.nom, sujet, html, texte });
};

/** Jeton de réinitialisation (15 min, usage unique) puis envoi du lien */
const envoyerReinitialisation = async (utilisateur) => {
  const { jeton, empreinte, expire } = genererJetonVerification(DUREE_REINITIALISATION_MS);
  await utilisateur.update({ jetonReinitialisation: empreinte, jetonReinitialisationExpire: expire });

  const lien = `${urlApplication()}/reinitialiser-mot-de-passe?token=${encodeURIComponent(jeton)}`;
  const { sujet, html, texte } = gabaritReinitialisation({ nom: utilisateur.nom, lien });
  return envoyerEmail({ destinataire: utilisateur.email, nom: utilisateur.nom, sujet, html, texte });
};

/** Prévient le titulaire du compte que son mot de passe a changé */
const notifierMotDePasseModifie = (utilisateur) => {
  const { sujet, html, texte } = gabaritMotDePasseModifie({ nom: utilisateur.nom });
  return envoyerEmail({ destinataire: utilisateur.email, nom: utilisateur.nom, sujet, html, texte });
};

module.exports = {
  verificationEmailActive,
  envoyerVerification,
  envoyerReinitialisation,
  notifierMotDePasseModifie,
  hacherJeton,
  envoyerEmail,
  DUREE_VALIDITE_MS,
  DUREE_REINITIALISATION_MS,
};
