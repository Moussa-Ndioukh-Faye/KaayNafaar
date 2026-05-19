#!/bin/bash
# ============================================
# Deploy — Kaay Nafaar Backend sur VPS
# Usage: ./scripts/deploy.sh <user>@<host>
# ============================================

set -euo pipefail

SSH_TARGET="${1:?Usage: $0 <user>@<host>}"
REMOTE_DIR="${REMOTE_DIR:-/opt/kaay-nafaar}"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Déploiement vers ${SSH_TARGET}..."

# 1. Rsync les fichiers du projet (exclut node_modules, .env, etc.)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.git' \
  --exclude '*.sqlite' \
  --exclude 'dist' \
  ./ "${SSH_TARGET}:${REMOTE_DIR}/"

# 2. SSH : déploiement
ssh "${SSH_TARGET}" << 'EOF'
  set -euo pipefail
  cd /opt/kaay-nafaar

  echo "📦 Création du fichier .env s'il n'existe pas..."
  if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "⚠️  backend/.env créé depuis .env.example — ÉDITEZ-LE avec vos vraies clés !"
  fi

  echo "🐳 Démarrage des containers..."
  docker compose -f "${COMPOSE_FILE}" pull
  docker compose -f "${COMPOSE_FILE}" up --build -d

  echo "🧹 Nettoyage des anciennes images..."
  docker image prune -f

  echo "✅ Déploiement terminé !"
  docker compose -f "${COMPOSE_FILE}" ps
EOF
