#!/bin/bash
# ============================================
# Setup VPS — Kaay Nafaar
# À exécuter une seule fois sur le VPS
# ============================================

set -euo pipefail

echo "🔧 Configuration du VPS pour Kaay Nafaar..."

# 1. Mise à jour du système
apt update && apt upgrade -y

# 2. Installer Docker
if ! command -v docker &> /dev/null; then
  echo "📦 Installation de Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# 3. Installer Docker Compose plugin
if ! docker compose version &> /dev/null; then
  echo "📦 Installation de Docker Compose..."
  apt install -y docker-compose-plugin
fi

# 4. Installer Caddy (reverse proxy + SSL automatique)
if ! command -v caddy &> /dev/null; then
  echo "📦 Installation de Caddy..."
  apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt update && apt install -y caddy
fi

# 5. Firewall : SSH + HTTP/HTTPS
echo "🔥 Configuration du firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 6. Créer le répertoire de l'application
mkdir -p /opt/kaay-nafaar

echo ""
echo "✅ VPS prêt !"
echo ""
echo "Prochaines étapes :"
echo "  1. Copier le projet : rsync -avz ./ <user>@<host>:/opt/kaay-nafaar/"
echo "  2. Configurer backend/.env"
echo "  3. Lancer : docker compose -f docker-compose.prod.yml up -d"
echo "  4. Configurer Caddy : sudo nano /etc/caddy/Caddyfile"
echo "     Exemple :"
echo "       api.ton-domaine.com {"
echo "         reverse_proxy localhost:5001"
echo "       }"
echo ""
