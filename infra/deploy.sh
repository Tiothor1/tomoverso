#!/usr/bin/env bash
# ============================================================
# deploy.sh — Deploy da Tomo Verso na VPS
# Uso: ssh vps 'bash -s' < deploy.sh
# ou: curl -sL https://raw.githubusercontent.com/Tiothor1/tomoverso/main/infra/deploy.sh | bash
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/Tiothor1/tomoverso.git"
APP_DIR="/opt/tomoverso"
COMPOSE_FILE="$APP_DIR/infra/docker-compose.yml"

echo "🚀 Tomo Verso Deploy"
echo "────────────────────"

# ── 1. Instalar Docker se necessário ──
if ! command -v docker &>/dev/null; then
  echo "📦 Instalando Docker..."
  curl -fsSL https://get.docker.com | bash
  sudo usermod -aG docker "$USER"
fi

if ! command -v docker compose &>/dev/null; then
  echo "📦 Instalando Docker Compose..."
  sudo apt-get install -y docker-compose-plugin
fi

# ── 2. Clonar/atualizar o repositório ──
if [ -d "$APP_DIR" ]; then
  echo "🔄 Atualizando repositório..."
  cd "$APP_DIR"
  git stash || true
  git pull origin main
else
  echo "📥 Clonando repositório..."
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER:$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 3. Copiar .env (se existir) ──
if [ -f ".env.production" ]; then
  echo "🔑 Usando .env.production"
  cp .env.production .env
fi

# ── 4. Build e restart ──
echo "🏗️  Buildando containers..."
docker compose -f "$COMPOSE_FILE" build --no-cache tomoverso

echo "🔄 Reiniciando serviços..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── 5. Verificar se subiu ──
echo "⏳ Aguardando healthcheck..."
sleep 10
if docker compose -f "$COMPOSE_FILE" ps tomoverso | grep -q "healthy"; then
  echo "✅ Deploy concluído com sucesso!"
else
  echo "⚠️  Container pode não estar saudável. Verifique:"
  echo "   docker compose -f $COMPOSE_FILE logs tomoverso"
fi

echo "📋 Logs:"
docker compose -f "$COMPOSE_FILE" logs --tail=20 tomoverso
