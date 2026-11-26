# 🚀 Kaay Nafaar — Plateforme de révision intelligente (v2.5.0)

Application full-stack (React + Node.js + PostgreSQL + LangChain) pour aider les étudiants à organiser leurs cours, comprendre leurs leçons, et générer automatiquement des fiches, quiz et flashcards augmentés par l'IA.

---

## 🏗️ Structure du projet

```
revision/
├── .github/workflows/       CI/CD GitHub Actions
├── backend/                 Node.js + Express + PostgreSQL (pgvector)
│   ├── src/
│   │   ├── config/          database.js (Sequelize)
│   │   ├── models/          User, Course, Fiche, Quiz, Progression
│   │   ├── controllers/     auth, courses, fiches, quiz, ai
│   │   ├── utils/           aiPro.js (RAG & Embeddings)
│   └── tests/
├── frontend/                React + Vite + Tailwind CSS (Shadcn UI)
│   ├── src/
│   │   ├── components/      Navbar, Sidebar, UI (Bento style)
│   │   └── pages/           Home, MesCours, Fiches, Quiz, AssistantIA
│   ├── vercel.json          Configuration Vercel
│   └── Dockerfile           Multi-stage (build + nginx)
└── docker-compose.yml       Stack complète (développement local)
```

---

## ⚡ Prérequis

- Node.js 20+
- Docker & Docker Compose
- Clé API Gemini (ou GROQ) pour le RAG et le Chat
- PostgreSQL 16 avec extension `pgvector` (géré par Docker)

---

## 🚀 Démarrage Rapide (Développement)

```bash
# 1. Cloner le projet
git clone <url> && cd revision

# 2. Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos clés API

# 3. Mot de passe de la base locale (fichier .env à la racine, jamais commité)
echo "DB_PASSWORD=$(openssl rand -hex 16)" > .env

# 4. Lancer toute la stack (Docker)
docker compose up --build
```

Services accessibles :
- **Frontend :** http://localhost:3000
- **Backend :** http://localhost:5001
- **PostgreSQL :** localhost:5432

---

## 🛠️ Installation Locale (sans Docker)

### Backend

```bash
cd backend
cp .env.example .env     # Configurer vos clés
npm install
npm run dev              # Mode développement (nodemon)
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start                # Vite dev server (port 3000)
```

---

## 🌐 Déploiement

### Frontend → Vercel (gratuit)

1. Pousser le code sur GitHub
2. Aller sur [vercel.com](https://vercel.com) → Importer le dépôt
3. Configurer :
   - **Root Directory :** `frontend`
   - **Framework :** Vite
   - **Variable d'environnement :** `VITE_BACKEND_URL` → URL du backend Render
4. Déployer (auto-déploiement sur chaque push `main`)

### Backend → Render

Le backend est décrit dans `render.yaml` (Blueprint Render). Les secrets se règlent
**uniquement** dans le tableau de bord Render (Environment), jamais dans le dépôt.

### Base de données → Supabase (PostgreSQL + pgvector)

Renseigner `DATABASE_URL` sur Render avec le rôle applicatif dédié (pas le rôle `postgres`).

### CI (GitHub Actions)

Le workflow `ci.yml` exécute les tests et le lint du backend et du frontend, puis le build.

---

## 🔑 Variables d'environnement

Voir `backend/.env.example` pour la liste complète.

| Variable | Description | Requis |
|----------|-------------|--------|
| `DB_HOST` | Hôte PostgreSQL | Oui |
| `DB_USER` | Utilisateur DB | Oui |
| `DB_PASSWORD` | Mot de passe DB | Oui |
| `DB_NAME` | Nom de la base | Oui |
| `JWT_SECRET` | Clé JWT (64 hex chars) | Oui |
| `COOKIE_SECRET` | Clé cookies (64 hex chars) | Oui |
| `GEMINI_API_KEY` | Google Gemini API | Au moins un |
| `GROQ_API_KEY` | GROQ API | Au moins un |
| `TAVILY_API_KEY` | Recherche web | Optionnel |
| `FRONTEND_URL` | URLs autorisées CORS | Oui |

---

## 🧠 Fonctionnalités IA Avancées

- **Recherche Vectorielle (RAG) :** L'assistant IA indexe vos documents dans `pgvector` pour répondre avec précision en utilisant votre propre base de connaissances.
- **Génération Haute Fidélité :** Création de fiches, quiz et plannings basés sur le contenu réel de vos cours.
- **Export PDF Premium :** Moteur d'exportation PDF avec design institutionnel et mise en page aérée.
- **Chat Streaming :** Réponses en temps réel pour une interactivité fluide.

---

## 🛠️ Commandes utiles

```bash
# Backend
npm run dev           # Développement
npm start             # Production
npm test              # Tests
npm run lint          # Linting
npm run db:migrate    # Migration DB (production)

# Frontend
npm start             # Développement
npm run build         # Build production
npm run preview       # Preview du build
```

---

## 🚀 Déploiement

| Partie | Hébergeur | Déclenchement |
| --- | --- | --- |
| Frontend | Vercel | Automatique à chaque push sur `main` |
| Backend | Render (offre gratuite, `render.yaml`) | Automatique sur `main` quand la CI est verte |
| Base de données | Supabase (Postgres + pgvector) | — |

Sans Redis, le backend traite les cours importés directement (pas de file d'attente). Sur l'offre gratuite de Render, le service se met en veille après 15 minutes sans visite et met environ une minute à se réveiller.

## ✅ Normes et conformité

| Norme | Application dans le projet |
| --- | --- |
| **OWASP Top 10 / ASVS** | CORS et CSRF en liste blanche, JWT HS256 avec révocation, uploads privés, validation des entrées, Helmet + HSTS — voir [SECURITY.md](SECURITY.md) |
| **NIST SP 800-63B** | Mots de passe de 8 caractères minimum, sans règles de composition imposées |
| **WCAG 2.2 AA** | Libellés de formulaires, lien d'évitement, focus visible, contraste AA, `prefers-reduced-motion`, lint `jsx-a11y` bloquant en CI |
| **Loi sénégalaise 2008-12 (CDP) / RGPD** | Page `/confidentialite`, consentement à l'inscription, export des données (`GET /api/auth/export`), suppression complète du compte |
| **Conventional Commits / SemVer** | Voir [CONTRIBUTING.md](CONTRIBUTING.md) |

Les dépendances sont auditées à chaque CI (`npm audit --audit-level=high`) et mises à jour chaque semaine par Dependabot.

---

## 📄 Licence

[MIT](LICENSE) — © 2026 Moussa Ndioukh Faye. Développé avec passion pour une réussite académique augmentée par l'IA.
