# 🚀 Kaay Nafaar — Plateforme de révision intelligente (v2.5.0)

Application full-stack (React + Node.js + PostgreSQL + LangChain) pour aider les étudiants à organiser leurs cours, comprendre leurs leçons, et générer automatiquement des fiches, quiz et flashcards augmentés par l'IA.

---

## 🏗️ Structure du projet

```
revision/
├── .github/workflows/    CI/CD GitHub Actions
├── backend/             Node.js + Express + PostgreSQL (pgvector)
│   ├── src/
│   │   ├── config/       database.js (Sequelize)
│   │   ├── models/       User, Course, Fiche, Quiz, Progression
│   │   ├── controllers/  auth, courses, fiches, quiz, ai
│   │   ├── utils/        aiPro.js (RAG & Embeddings)
│   └── tests/
├── frontend/            React + Vite + Tailwind CSS (Shadcn UI)
│   ├── src/
│   │   ├── components/   Navbar, Sidebar, UI (Bento style)
│   │   └── pages/       Home, MesCours, Fiches, Quiz, AssistantIA
├── docker-compose.yml   Orchestration complète (DB + BE + FE)
└── Dockerfile
```

---

## ⚡ Prérequis

- Node.js 20+
- Docker & Docker Compose
- Clé API OpenAI (pour les Embeddings et le Chat)
- PostgreSQL 16 avec extension `pgvector` (géré par Docker)

---

## 🚀 Démarrage Rapide (Docker)

La méthode la plus simple pour lancer toute la stack :

```bash
docker-compose up --build
```

Services accessibles :
- **Frontend :** http://localhost:3000
- **Backend :** http://localhost:5001
- **PostgreSQL :** localhost:5432

---

## 🛠️ Installation Locale

### Backend

```bash
cd backend
npm install
# Configurez votre .env (voir section variables)
npm run dev      # Mode développement avec rechargement automatique
```

### Frontend

```bash
cd frontend
npm install
npm start        # Lance le serveur Vite
```

---

## 🔑 Variables d'environnement (backend/.env)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Hôte PostgreSQL (ex: `localhost` ou `postgres`) |
| `DB_USER` | Utilisateur base de données (`user_admin`) |
| `DB_PASSWORD` | Mot de passe (`password_secret`) |
| `DB_NAME` | Nom de la base (`kaay_nafaar_v2`) |
| `JWT_SECRET` | Clé secrète pour les tokens JWT |
| `OPENAI_API_KEY` | Requis pour le RAG et les Embeddings |

---

## 🧠 Fonctionnalités IA Avancées

- **Recherche Vectorielle (RAG) :** L'assistant IA indexe vos documents dans `pgvector` pour répondre avec précision en utilisant votre propre base de connaissances.
- **Génération Haute Fidélité :** Création de fiches, quiz et plannings basés sur le contenu réel de vos cours.
- **Export PDF Premium :** Moteur d'exportation PDF avec design institutionnel et mise en page aérée.
- **Chat Streaming :** Réponses en temps réel pour une interactivité fluide.

---

## 🎨 Design & Interface

- **Style Bento :** Interface moderne utilisant des cartes à bords arrondis (`rounded-3xl`) et des ombres douces.
- **Dark Mode :** Support complet du mode sombre avec des palettes de couleurs optimisées (Slate/Indigo).
- **Responsive :** Design "Mobile First" avec une Sidebar adaptative.
- **Composants :** Basé sur Radix UI et Tailwind CSS pour une accessibilité maximale.

---

## 🔐 Sécurité & Intégrité

- **Authentification :** Cookies `httpOnly` et `SameSite: Strict` pour prévenir les attaques CSRF/XSS.
- **Transactions SQL :** Utilisation de `Sequelize` pour garantir l'atomicité des opérations sensibles.
- **Protection IA :** Filtrage contre l'injection de prompt (Prompt Injection Protection).

---

## 🛠️ Technologies

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Shadcn UI |
| **Backend** | Node.js, Express, Sequelize (PostgreSQL) |
| **Base de données** | PostgreSQL 16 + pgvector (Recherche vectorielle) |
| **IA & RAG** | LangChain.js, OpenAI Embeddings |
| **DevOps** | Docker, Docker Compose, GitHub Actions |

---

## 📄 License

MIT - Développé avec passion pour une réussite académique augmentée par l'IA.
