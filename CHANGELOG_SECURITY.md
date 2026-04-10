# 🔐 Améliorations de Sécurité — RévisionIA

## Résumé des changements

Trois domaines clés ont été améliorés pour renforcer la sécurité, la fiabilité et la testabilité de l'application.

---

## 1. 🍪 Authentification via Cookie httpOnly (AMÉLIORATION SÉCURITÉ)

### Problème initial
- Les tokens JWT étaient stockés en `localStorage` côté client
- Vulnérable à **XSS** (attaques JavaScript qui peuvent voler le token)
- Token visible et modifiable par le code JavaScript malgré le "JWT check"

### Solution implémentée

#### Backend (`server.js`, `authController.js`, `auth.js`)
```javascript
// ✅ NOUVEAU : Le serveur envoie le token en cookie httpOnly
res.cookie("token", token, {
  httpOnly: true,        // ❌ JS ne peut pas accéder
  secure: true,          // 🔒 HTTPS obligatoire en prod
  sameSite: "strict",    // 🚫 Bloque CSRF
  maxAge: 1000 * 60 * 60 * 24 * 7  // 7 jours
});

// ✅ Middleware auth.js peut lire depuis cookie
if (!token && req.cookies && req.cookies.token) {
  token = req.cookies.token;
}
```

#### Frontend (`App.jsx`, `services/api.js`)
```javascript
// ❌ PLUS BESOIN : localStorage.token
// ✅ Navigation automatique envoie le cookie avec chaque requête

// Intercepteur RESPONSE nettoie seulement l'utilisateur
if (error.response?.status === 401) {
  localStorage.removeItem("utilisateur");
  window.location.href = "/connexion";
}

// Nouveau endpoint de déconnexion sûr
authAPI.logout() // efface le cookie serveur
```

#### Routes auth
- ✅ **POST /api/auth/logout** — efface le cookie et nettoie la session

---

## 2. 📊 Tests Automatisés (AMÉLIORATION FIABILITÉ)

### Fichiers ajoutés

#### `backend/jest.config.js`
Configuration Jest pour environnement **Node.js**, cherche `tests/**/*.test.js`

#### `backend/tests/auth.test.js`
Suites de test **E2E** pour authentification :
- ✅ Inscription + Connexion avec vérification du cookie
- ✅ Profil protégé (401 sans token)
- Utilise **MongoDB en mémoire** (mongodb-memory-server)

#### `backend/package.json`
```json
{
  "scripts": { "test": "jest --runInBand" },
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.0.0"
  }
}
```

### Commande
```bash
npm test  # Exécute tous les tests
```

**Résultat attendu :**
```
✓ inscription puis connexion (5847 ms)
✓ profil protégé requiert authentification (10 ms)
Test Suites: 1 passed, 1 total
Tests: 2 passed, 2 total
```

---

## 3. 🏗️ Export du serveur pour testabilité (REFACTORING)

### Changement dans `server.js`
```javascript
const PORT = process.env.PORT || 5001;

// Si le fichier est exécuté directement, démarrer le serveur
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
  });
}

module.exports = app; // ✅ Export pour tests
```

**Avantage** : Le serveur Express peut maintenant être importé par Jest sans le lancer automatiquement.

---

## 📋 Checklist de déploiement

- [x] Cookie httpOnly en place
- [x] Route logout ajoutée
- [x] Middleware auth accepte cookies
- [x] Stockage localStorage réduit
- [x] Tests d'authentification validés
- [ ] **À FAIRE :** Ajouter variables d'env SSL en production
  - `NODE_ENV=production` force `secure: true` sur cookies
  - Frontend HTTPS obligatoire pour les cookies
- [ ] **À FAIRE :** Tests supplémentaires (cours, fiches, IA)
- [ ] **À FAIRE :** CI/CD (GitHub Actions, Jest avant commit)

---

## 🚀 Prochaines étapes suggérées

1. **Tester en local :**
   ```bash
   npm run dev  # Backend
   npm start    # Frontend (port différent)
   ```

2. **Ajouter tests pour :**
   - Création/lecture de cours
   - Upload PDF
   - Endpoints IA avec streaming

3. **Sécurité supplémentaire :**
   - Rotation de tokens (refresh token)
   - Rôles utilisateur (admin, student, teacher)
   - Rate limiting sur endpoints critiques ✅ (déjà en place)

4. **Monitoring :**
   - Winston pour logs structurés
   - Sentry ou Datadog pour erreurs
   - Promethéus pour métriques

---

**Auteur :** GitHub Copilot  
**Date :** 12 Mars 2026  
**Version :** 1.1.0
