# Politique de sécurité

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue publique** pour une faille de sécurité.
Utilise le signalement privé de GitHub : onglet **Security → Report a vulnerability** de ce dépôt.

Indique si possible :

- la description de la faille et son impact ;
- les étapes pour la reproduire ;
- la version ou le commit concerné.

Nous accusons réception sous 72 heures et visons un correctif sous 30 jours pour les failles graves.
Nous te créditerons dans la note de version si tu le souhaites (divulgation coordonnée, ISO/IEC 29147).

## Versions prises en charge

Seule la dernière version de la branche `main` (déployée en production) reçoit des correctifs.

## Mesures en place

Le projet suit l'**OWASP Top 10 (2021)** et l'**OWASP ASVS** :

| Domaine | Mesure |
| --- | --- |
| Contrôle d'accès (A01) | Toutes les ressources sont filtrées par `utilisateurId` ; les fichiers importés ne sont pas servis publiquement |
| Cryptographie (A02) | Mots de passe hachés avec bcrypt (coût 12) ; HTTPS + HSTS |
| Injection (A03) | Requêtes paramétrées (Sequelize), validation `express-validator` |
| Configuration (A05) | Helmet (CSP, HSTS, nosniff…), erreurs 5xx sans détails en production, CORS en liste blanche |
| Composants (A06) | `npm audit` en CI, Dependabot hebdomadaire |
| Authentification (A07) | JWT HS256 imposé, cookies `httpOnly`/`Secure`, limitation des tentatives par IP **et par compte**, révocation au changement de mot de passe, politique NIST SP 800-63B (8 caractères min.) |
| Mot de passe oublié | Lien par email valable 15 min, usage unique, seule l'empreinte SHA-256 est stockée, réponse identique que le compte existe ou non, pas de connexion automatique, email de notification après modification |
| Journalisation (A09) | Journal JSON des événements sensibles (échecs de connexion, refus CSRF, limites atteintes, fichiers refusés, réinitialisations), emails masqués ; alerte « activité suspecte » après 5 échecs en 60 s (log + email à `SECURITY_ALERT_EMAIL`) |
| Coûts / abus | Quotas quotidiens par utilisateur : `AI_QUOTA_JOUR` (100) et `IMPORTS_QUOTA_JOUR` (20) |
| Upload | Nom de fichier aléatoire, contrôle extension + type MIME **+ signature réelle du contenu** (PDF, PNG, JPEG, texte UTF-8), 50 Mo max |
| IP du client | `TRUST_PROXY=2` en production (Vercel → Render) pour que les limites s'appliquent à chaque étudiant et non à l'IP de Vercel |
| CSRF | Vérification stricte de `Origin`/`Referer` sur les requêtes modifiantes |

## Secrets

Aucun secret ne doit être commité. Les variables sont décrites dans `backend/.env.example`.
`JWT_SECRET` et `COOKIE_SECRET` doivent faire au moins 32 caractères (par ex. `openssl rand -hex 32`).
