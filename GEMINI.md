# 🚀 Kaay Nafaar — Guide des Fonctionnalités Avancées (v2.5.0)

Ce document décrit les fonctionnalités professionnelles ajoutées pour transformer l'application en un outil de productivité intelligent de niveau entreprise.

---

## 🧠 1. Recherche Vectorielle & Recherche Web Hybride (RAG+)

L'Assistant IA utilise désormais une architecture de recherche hybride avancée :
- **Recherche Locale (Priorité) :** Utilise `pgvector` et la recherche plein texte pour interroger les documents de l'utilisateur.
- **Recherche Web (Fallback Intelligent) :** Intégration de l'API **Tavily** pour compléter les connaissances si les documents locaux sont insuffisants ou si l'utilisateur demande des informations récentes.

### Fonctionnement de l'Orchestrateur :
1. **Local First :** L'IA cherche d'abord dans tes cours indexés.
2. **Analyse de Confiance :** Si aucune information pertinente n'est trouvée localement, ou si la question concerne l'actualité/le web, l'orchestrateur déclenche une recherche web.
3. **Fusion de Contexte :** Les sources sont fusionnées. L'IA est instruite de prioriser tes cours tout en utilisant le web comme complément.
4. **Citations Transparentes :** Les sources web sont affichées avec une icône de globe et un lien direct vers l'article source.

### Configuration requise :
- `TAVILY_API_KEY` : Clé API pour la recherche web (à ajouter dans le `.env`).

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
