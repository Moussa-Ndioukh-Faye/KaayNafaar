# RévisionIA — Plateforme de révision intelligente

Application full-stack (React + Node.js + MongoDB + Claude API) pour aider les étudiants à organiser leurs cours, comprendre leurs leçons, et générer automatiquement des fiches, quiz et flashcards.

---

## Structure du projet

```
revision/
├── .github/workflows/    CI/CD GitHub Actions
├── .sixth/skills/        Skills pour agents IA
├── backend/             Node.js + Express + MongoDB
│   ├── server.js
│   ├── .env
│   ├── src/
│   │   ├── config/       db.js
│   │   ├── models/       User, Course, Fiche, Quiz, Progression
│   │   ├── controllers/  auth, courses, fiches, quiz, ai
│   │   ├── routes/
│   │   └── middleware/  auth.js, securite.js
│   └── tests/
├── frontend/            React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx
│   │   ├── services/     api.js
│   │   ├── components/   Navbar, Sidebar
│   │   └── pages/       Home, MesCours, Fiches, Quiz, Planning, AssistantIA
│   └── public/
├── docker-compose.yml
└── Dockerfile
```

---

## Prérequis

- Node.js 18+
- Docker & Docker Compose (optionnel)
- MongoDB (local ou MongoDB Atlas)
- Clé API Anthropic (claude.ai)

---

## Installation et démarrage

### Option 1: Docker (recommandé)

```bash
docker-compose up --build
```

Services accessibles:
- Frontend: http://localhost
- Backend: http://localhost:5000
- MongoDB: localhost:27017

### Option 2: Local

#### Backend

```bash
cd backend
npm install
# Vérifier .env (MONGO_URI, JWT_SECRET, ANTHROPIC_API_KEY)
mkdir uploads
npm run dev      # développement (nodemon)
npm start       # production
```

#### Frontend

```bash
cd frontend
npm install
npm run dev     # développement (Vite)
npm run build   # production
```

---

## Variables d'environnement (backend/.env)

| Variable            | Description                              |
|---------------------|------------------------------------------|
| `MONGO_URI`         | URI de connexion MongoDB                 |
| `JWT_SECRET`        | Clé secrète JWT (min 32 caractères)      |
| `JWT_EXPIRE`        | Durée de validité du token (ex: `7d`)    |
| `ANTHROPIC_API_KEY` | Clé API Anthropic                        |
| `PORT`              | Port du serveur (défaut : 5000)          |
| `FRONTEND_URL`      | URL du frontend pour CORS                |
| `COOKIE_SECRET`     | (optionnel) clé pour signer cookies      |

---

## API Endpoints

### Auth
| Méthode | Route                         | Description                   |
|---------|-------------------------------|-------------------------------|
| POST    | `/api/auth/inscription`       | Créer un compte (cookie httpOnly) |
| POST    | `/api/auth/connexion`         | Se connecter                  |
| POST    | `/api/auth/logout`            | Se déconnecter                |
| GET     | `/api/auth/profil`            | Voir son profil               |
| PUT     | `/api/auth/profil`            | Modifier son profil           |
| PUT     | `/api/auth/changer-mot-de-passe` | Changer le mot de passe   |
| DELETE  | `/api/auth/compte`            | Supprimer le compte           |

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
| POST    | `/api/ai/generer-quiz`   | Générer un quiz (streaming)  |
| POST    | `/api/ai/expliquer`      | Expliquer un concept          |
| POST    | `/api/ai/planning`       | Générer un planning           |
| POST    | `/api/ai/chat`           | Chat IA (streaming)           |

---

## Sécurité implémentée

- **JWT** : authentification stateless, tokens expirables
- **Stockage du token** : cookie httpOnly (plus sûr que localStorage)
- **Logout serveur** : /api/auth/logout efface le cookie
- **Bcrypt** : hash des mots de passe (saltRounds=12)
- **Rate limiting** : 200 req/15min global, 10/15min sur auth, 10/min sur IA
- **Anti-injection NoSQL** : suppression des opérateurs `$`
- **En-têtes HTTP** : X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **CORS** : origins autorisées explicitement
- **Validation côté client** : regex email, longueurs max, types de fichiers
- **CSP** : Content-Security-Policy
- **Helmet** : protection des headers

---

## Fonctionnalités IA (Claude Opus 4)

- **Génération de fiches** : résumé, concepts clés, flashcards, conseils
- **Génération de quiz** : questions QCM avec explications
- **Explication de concepts** : analogies, exemples concrets
- **Planning intelligent** : sessions adaptées aux cours
- **Chat assistant** : réponses en streaming temps réel
- **Export PDF** : fiches exportables en PDF

---

## Fonctionnalités Frontend

- **Page Profil** : modification, changement mot de passe, suppression compte
- **Dark Mode** : support du thème sombre
- **ErrorBoundary** : gestion centralisée des erreurs React
- **PWA** : support hors-ligne
- **Export PDF** : génération de PDF côté client

---

## CI/CD

GitHub Actions configuré (`.github/workflows/ci.yml`):
- Test backend (Jest)
- Build frontend
- Linting backend (ESLint)

---

## Technologies

| Layer       | Technologies                              |
|-------------|-------------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS, React Router |
| Backend     | Node.js, Express, MongoDB/Mongoose       |
| Auth        | JWT, Bcrypt, Cookies httpOnly             |
| IA          | Anthropic Claude API (streaming)          |
| DevOps      | Docker, GitHub Actions                    |
| Tests       | Jest (backend), Vitest (optionnel)        |

---

## License

MIT