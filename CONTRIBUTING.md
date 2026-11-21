# Contribuer à Kaay Nafaar

## Démarrer

```bash
nvm use            # Node 20 (voir .nvmrc)
docker compose up --build
```

## Règles

1. **Branche** : crée une branche depuis `main` (`feat/...`, `fix/...`, `docs/...`). Pas de push direct sur `main` : chaque push y déclenche le déploiement.
2. **Commits** : format [Conventional Commits](https://www.conventionalcommits.org/fr/) — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`.
3. **Avant d'ouvrir une pull request**, tout doit passer :

   ```bash
   cd backend  && npm run lint && npm test
   cd frontend && npm run lint && npm run build
   ```

   Le lint frontend inclut les règles d'accessibilité `jsx-a11y` et n'accepte aucun avertissement.

## Normes suivies

- **Sécurité** : OWASP Top 10 / ASVS — voir [SECURITY.md](SECURITY.md).
- **Accessibilité** : WCAG 2.2 niveau AA — chaque champ a un `<label>` associé, les boutons icônes ont un `aria-label`, le contraste du texte est d'au moins 4,5:1, tout est utilisable au clavier.
- **Données personnelles** : loi sénégalaise n° 2008-12 et RGPD — toute nouvelle donnée collectée doit être documentée dans la page `/confidentialite`, incluse dans l'export (`GET /api/auth/export`) et supprimée avec le compte.
- **Style** : Prettier + ESLint, indentation 2 espaces (`.editorconfig`).
