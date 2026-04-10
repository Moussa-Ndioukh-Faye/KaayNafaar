# RévisionIA 🎓 — Plateforme de révision intelligente

Application full-stack (React + Node.js + MongoDB + Claude API) pour aider les étudiants à organiser leurs cours, comprendre leurs leçons, et générer automatiquement des fiches, quiz et flashcards.

---

## Structure du projet

```
revision/
├── backend/          Node.js + Express + MongoDB
│   ├── server.js
│   ├── .env.example  ← Copier en .env et remplir
│   └── src/
│       ├── config/db.js
│       ├── models/         User, Course, Fiche, Quiz, Progression
│       ├── controllers/    auth, courses, fiches, quiz, ai
│       ├── routes/
│       └── middleware/     auth.js, securite.js
└── frontend/         React + Tailwind CSS
    └── src/
        ├── App.jsx
        ├── services/api.js
        ├── components/   Navbar, Sidebar
        └── pages/        Home, MesCours, Fiches, Quiz, Planning, AssistantIA
```

---

## Prérequis

- Node.js 18+
- MongoDB (local ou MongoDB Atlas)
- Clé API Anthropic (claude.ai)

---

## Installation et démarrage

### 1. Backend

```bash
cd backend
npm install

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env : MONGO_URI, JWT_SECRET, ANTHROPIC_API_KEY

# Créer le dossier uploads
mkdir uploads

# Démarrer
npm run dev      # développement (nodemon)
npm start        # production
```

### 2. Frontend

```bash
cd frontend
npm install
npm start        # Lance sur http://localhost:3000
```

---

## Variables d'environnement (backend/.env)

| Variable          | Description                              |
|-------------------|------------------------------------------|
| `MONGO_URI`       | URI de connexion MongoDB                 |
| `JWT_SECRET`      | Clé secrète JWT (min 32 caractères)      |
| `JWT_EXPIRE`      | Durée de validité du token (ex: `7d`)    |
| `ANTHROPIC_API_KEY` | Clé API Anthropic                      |
| `PORT`            | Port du serveur (défaut : 5000)          |
| `FRONTEND_URL`    | URL du frontend pour CORS                |
| `COOKIE_SECRET`   | (optionnel) clé pour signer cookies si besoin, non stocké en front |

---

## API Endpoints

### Auth
| Méthode | Route                    | Description          |
|---------|--------------------------|----------------------|
| POST    | `/api/auth/inscription`  | Créer un compte (envoie cookie httpOnly)
| POST    | `/api/auth/connexion`    | Se connecter (cookie httpOnly)
| POST    | `/api/auth/logout`       | Se déconnecter (efface le cookie)
| GET     | `/api/auth/profil`       | Voir son profil       |
| PUT     | `/api/auth/profil`       | Modifier son profil  |
| PUT     | `/api/auth/changer-mot-de-passe` | Changer le mot de passe |
| DELETE  | `/api/auth/compte`       | Supprimer le compte  |

### Cours
| Méthode | Route               | Description              |
|---------|---------------------|--------------------------|
| GET     | `/api/courses`      | Lister ses cours         |
| POST    | `/api/courses`      | Créer un cours (+ PDF)   |
| PUT     | `/api/courses/:id`  | Modifier                 |
| DELETE  | `/api/courses/:id`  | Supprimer                |

### IA (Claude)
| Méthode | Route                    | Description                   |
|---------|--------------------------|-------------------------------|
| POST    | `/api/ai/generer-fiche`  | Générer une fiche (streaming) |
| POST    | `/api/ai/generer-quiz`   | Générer un quiz (streaming)   |
| POST    | `/api/ai/expliquer`      | Expliquer un concept          |
| POST    | `/api/ai/planning`       | Générer un planning           |
| POST    | `/api/ai/chat`           | Chat IA (streaming)           |

---

## Sécurité implémentée

- **JWT** : authentification stateless, tokens expirables
- **Stockage du token** : maintenant en **cookie httpOnly** (plus sûr que localStorage)
- **Logout serveur** : /api/auth/logout efface le cookie
- **Bcrypt** : hash des mots de passe (saltRounds=12)
- **Rate limiting** : 200 req/15min global, 10/15min sur auth, 10/min sur IA
- **Anti-injection NoSQL** : suppression des opérateurs `$` dans les inputs
- **En-têtes HTTP** : X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **CORS** : origins autorisées explicitement, méthodes limitées
- **Validation côté client** : regex email, longueurs max, types de fichiers
- **CSP** : Content-Security-Policy dans index.html
- **Token JWT** : vérification du format avant envoi

---

## Fonctionnalités IA (Claude Opus 4.6)

- **Génération de fiches** : résumé, concepts clés, flashcards, conseils de révision
- **Génération de quiz** : questions QCM avec explications
- **Explication de concepts** : analogies, exemples concrets
- **Planning intelligent** : sessions adaptées à tes cours et disponibilités
- **Chat assistant** : réponses en streaming temps réel

---

## Fonctionnalités ajoutées

- **Page Profil** : modification du profil, changement de mot de passe, suppression de compte
- **Dark Mode** : support du thème sombre
- **ErrorBoundary** : gestion centralisée des erreurs React