# Carnets et moteur de recherche (RAG) — architecture

Ce document décrit comment Kaay Nafaar lit les cours, les indexe, y cherche des passages
et produit les réponses et supports du studio. Il sert de référence pour toute évolution.

## Vue d'ensemble

```
Import (fichier, page web, note)
   │
   ▼
utils/lectureDocument.js ── page par page ; PDF scanné / photo → transcription Gemini
   │
   ▼
utils/indexation.js ─────── découpage en passages (page, section, ordre)
   │                         embeddings Gemini sur « Cours — Section + texte »
   ▼                         remplace les anciens passages du cours
table course_embeddings (pgvector) ── index HNSW halfvec, GIN plein texte, B-tree filtres
   │
   ▼
utils/passages.js ───────── recherche hybride filtrée par étudiant et par carnet
   │                         RRF pondéré → diversité → fusion des voisins → [n] + page
   ▼
services/carnets/* ──────── chat, guide, studio, audio, découverte
   │
   ▼
controllers/carnet*.js ──── routes HTTP fines (validation, accès, réponses)
```

## Modules

| Module | Responsabilité |
| --- | --- |
| `utils/lectureDocument.js` | Lire un fichier en pages. PDF avec moins de 120 caractères par page en moyenne : transcription Gemini (`<<<PAGE n>>>`). Photos : Gemini, puis Tesseract en secours. |
| `utils/indexation.js` | Découper en passages (diapositives courtes regroupées, longues pages découpées sur titres et paragraphes), calculer les embeddings par lots de 50, remplacer les passages du cours dans une transaction, créer les index au démarrage. |
| `utils/passages.js` | Recherche hybride et sélection des passages cités. |
| `utils/aiPro.js` | Embeddings (cache Redis 24 h), contexte RAG de l'assistant (même moteur que les carnets), invalidation du cache. |
| `services/normalisation.js` | Formats communs des quiz (`options`, `reponseCorrecte`) et flashcards, quel que soit ce que renvoie le modèle. |
| `services/cours.js` | Création d'un cours depuis un texte ou une page web (import protégé SSRF) + indexation. |
| `services/carnets/ia.js` | Appels au modèle, consigne anti-injection, extraction JSON, délai borné. |
| `services/carnets/sources.js` | Texte des sources d'un carnet, réparti et borné (24 000 caractères). |
| `services/carnets/guide.js` | Résumé du carnet et de chaque source, mis en cache par empreinte des sources. |
| `services/carnets/chat.js` | Styles, longueur, langue, consignes ; reformulation des questions de suivi ; relances. |
| `services/carnets/studio.js` | Types de productions, options autorisées, consignes, validation stricte. |
| `services/carnets/audio.js` | Formats et durées du résumé audio, réponse aux questions pendant l'écoute. |
| `services/carnets/decouverte.js` | Recherche de pages (Tavily) et import des pages choisies. |
| `services/carnets/acces.js` | Accès à un carnet par identifiant **et** propriétaire ; sources choisies. |

## Recherche (`rechercherPassages`)

1. **Deux recherches en parallèle**, toujours `WHERE metadata->>'utilisateurId' = :userId`
   (et `coursId IN (…)` pour un carnet) :
   - sémantique : `embedding::halfvec(3072) <=> …` (utilise l'index HNSW), avec
     `SET LOCAL hnsw.iterative_scan = relaxed_order` pour qu'un filtre très sélectif
     ne vide pas les résultats ;
   - mots-clés : `to_tsquery('french', 'mot1 | mot2 | …')` (OU, pas ET), construit à
     partir des seules lettres et chiffres (aucun opérateur ne passe).
2. Si l'étudiant pose une question de suivi, une **reformulation autonome** (modèle rapide,
   4 s maximum) est cherchée en plus de la question d'origine.
3. **Fusion RRF** (K = 60), poids 1 pour le sens et 0,8 pour les mots.
4. **Diversité** : au plus 60 % des passages viennent d'une même source quand il y en a plusieurs.
5. **Voisins** : deux passages consécutifs d'un cours sont réunis.
6. Numérotation `[n]`, avec titre, page (« p. 4–6 ») et section.

Une recherche en panne n'empêche pas l'autre de répondre.

## Données

| Table | Contenu |
| --- | --- |
| `course_embeddings` | `id`, `text`, `metadata` (`coursId`, `utilisateurId`, `titre`, `page`, `pageFin`, `section`, `ordre`, `total`), `embedding` |
| `carnets` | sources (`cours_ids`), notes, `guide` (cache + empreinte), `reglages` |
| `carnet_messages` | historique du chat, avec les passages cités et les relances |
| `carnet_productions` | productions du studio (plusieurs versions, avec leurs options) |

Les colonnes ajoutées à des tables existantes passent par `config/migrations.js`
(idempotent, `ADD COLUMN IF NOT EXISTS`). Une migration qui échoue est journalisée mais
ne fait jamais basculer le serveur sur SQLite.

## Sécurité

- Tout accès passe par l'identifiant **et** le propriétaire (carnet, cours, productions,
  messages, passages) ; testé dans `tests/carnets.test.js`.
- Le texte des sources est encadré par `<sources>` avec une consigne explicite : c'est de la
  matière à étudier, jamais des instructions.
- Toute production de l'IA est revalidée et bornée avant enregistrement ; une production vide
  n'est pas enregistrée.
- La clé Gemini part dans l'en-tête `x-goog-api-key`, jamais dans l'URL.
- Pages web : import protégé contre le SSRF (`utils/importLien.js`).
- Supprimer un cours supprime ses passages ; supprimer un compte supprime carnets, messages,
  productions et passages ; l'export des données les inclut.

## Tests

- `tests/rag.test.js` : lecture, découpage, indexation, recherche (filtres, HNSW, pannes).
- `tests/carnets.test.js` : routes de bout en bout (isolement, guide, chat, studio, audio, sources).
- `tests/services-carnets.test.js` : normalisation, réglages, options, audio, migrations.
- `frontend/src/pages/__tests__/Carnet.test.jsx` : interface du carnet.
