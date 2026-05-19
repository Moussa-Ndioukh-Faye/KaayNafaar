# 🚀 Kaay Nafaar — Plateforme de révision intelligente (v2.5.0)

Application full-stack (React + Node.js + PostgreSQL + LangChain) pour aider les étudiants à organiser leurs cours, comprendre leurs leçons, et générer automatiquement des fiches, quiz et flashcards augmentés par l'IA.

---

## 🏗️ Structure du projet

```
revision/
├── .github/workflows/       CI/CD GitHub Actions
├── scripts/                 Scripts de déploiement (VPS)
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
├── docker-compose.yml       Stack complète (dev)
├── docker-compose.prod.yml  Stack production (VPS, sans frontend)
└── caddy/                   Reverse proxy (SSL Let's Encrypt)
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

# 3. Lancer toute la stack (Docker)
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
   - **Variable d'environnement :** `VITE_API_URL` → `https://api.votre-domaine.com`
4. Déployer (auto-déploiement sur chaque push `main`)

### Backend → VPS (Docker)

**Option A : Déploiement manuel**

```bash
# Sur le VPS
git clone <url> /opt/kaay-nafaar
cd /opt/kaay-nafaar
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos vraies clés
docker compose -f docker-compose.prod.yml up -d
```

**Option B : Script automatisé**

```bash
# Depuis votre machine
./scripts/deploy.sh user@votre-vps.com
```

**Configuration du VPS (1ère fois) :**

```bash
# Lancer le script de setup
# (nécessite sudo)
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh
```

Puis configurer Caddy pour le SSL (éditer `/etc/caddy/Caddyfile`) :

```
api.ton-domaine.com {
    reverse_proxy localhost:5001
}
```

### CI/CD (GitHub Actions)

Le workflow CI (`ci.yml`) exécute automatiquement :
- Tests backend (Jest)
- Lint backend
- Build frontend
- Lint frontend
- Déploiement backend sur le VPS (si configuré avec les secrets GitHub)

**Secrets GitHub à configurer :**
- `VPS_HOST` : IP de votre VPS
- `VPS_USER` : Utilisateur SSH
- `VPS_SSH_KEY` : Clé privée SSH

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

## 📄 License

MIT - Développé avec passion pour une réussite académique augmentée par l'IA.
