# 🚀 Kaay Nafaar — Guide des Fonctionnalités Avancées (v2.5.0)

Ce document décrit les fonctionnalités professionnelles ajoutées pour transformer l'application en un outil de productivité intelligent de niveau entreprise.

---

## 🧠 1. Recherche Vectorielle & RAG (Retrieval-Augmented Generation)

L'Assistant IA utilise une architecture multi-modèles pour optimiser performance et coût :
- **Tâches Complexes (Gemini 2.0 Flash) :** Génération de fiches, quiz et plannings de révision.
- **Chat Rapide (Groq - Llama 3.3) :** Réponses instantanées dans le chat et explications de concepts.

### Optimisations de Performance :
- **Background Workers (BullMQ + Redis) :** L'extraction de texte (PDF/OCR) et l'indexation vectorielle sont désormais déportées dans une file d'attente en arrière-plan. Cela évite de bloquer le serveur principal lors de l'upload de gros documents.
- **Caching Intelligent (Redis) :** Les résultats des recherches sémantiques (RAG) sont mis en cache dans Redis. Si une question similaire est posée, la réponse est instantanée sans appel à la base de données vectorielle.

### Collaboration & Communauté :
- **Bibliothèque Publique :** Les utilisateurs peuvent désormais rendre leurs fiches publiques. Une nouvelle section "Bibliothèque" permet de découvrir, consulter et télécharger les ressources partagées par la communauté.

### Fonctionnement du RAG :
- **Indexation automatique :** Chaque fois qu'un cours est créé ou modifié, son texte est découpé en segments et transformé en vecteurs mathématiques (embeddings) via `text-embedding-004` (Google Gemini) stockés dans **PostgreSQL** via `pgvector`.
- **Recherche Sémantique :** Lorsque tu poses une question dans le chat sans sélectionner de cours spécifique, l'IA cherche automatiquement les segments les plus pertinents dans TOUS tes documents.

### Configuration requise :
- `GEMINI_API_KEY` : Pour les embeddings et les tâches de génération complexes.
- `GROQ_API_KEY` : Pour un chat ultra-rapide (optionnel, bascule sur Gemini si absent).
- La base de données doit utiliser l'image Docker `pgvector/pgvector`.

---

## 📄 2. Moteur d'Export PDF Premium

L'export HTML basique a été remplacé par un moteur de rendu PDF haute fidélité.

### Caractéristiques :
- **Design Institutionnel :** En-tête avec dégradés Indigo/Violet, typographie soignée et mise en page aérée.
- **Structure Intelligente :** Les sections (Résumé, Concepts, Flashcards) sont formatées de manière optimale pour l'impression.
- **Pagination Automatique :** Gestion propre des sauts de page et pieds de page numérotés.
- **Tableaux de Révision :** Les concepts et les flashcards sont présentés dans des tableaux stylisés pour une lecture rapide.

---

## 🔐 3. Sécurité de Grade Bancaire

- **Protection contre l'Injection de Prompt :** Filtrage heuristique des messages utilisateur pour empêcher le détournement des instructions de l'IA (standard OWASP LLM).
- **Cookies SameSite Strict :** Isolation complète des sessions contre les attaques CSRF.
- **Transactions SQL Atomiques :** Utilisation de `sequelize.transaction()` pour garantir l'intégrité des données lors des opérations sensibles (comme la suppression de compte).

---

## 🛠️ Stack Technique Mise à Jour

| Composant | Technologie | Usage |
|-----------|-------------|-------|
| **Base de données** | PostgreSQL 16 + pgvector | Stockage relationnel + vectoriel |
| **Orchestration IA** | LangChain.js | Gestion des embeddings et du RAG |
| **Génération PDF** | jsPDF + AutoTable | Exports professionnels haute qualité |
| **Interface** | Radix UI + shadcn/ui | Composants interactifs accessibles |

---

*Développé avec passion pour une réussite académique augmentée par l'IA.*
