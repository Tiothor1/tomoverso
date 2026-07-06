#!/usr/bin/env bash
# ============================================================
# deploy.sh — Deploy da Tomo Verso na VPS
# Uso na VPS:
#   curl -fsSL https://raw.githubusercontent.com/Tiothor1/tomoverso/main/infra/deploy.sh | bash
# ============================================================
set -euo pipefail

REPO_URL="https://github.com/Tiothor1/tomoverso.git"
APP_DIR="/opt/tomoverso"
COMPOSE_FILE="$APP_DIR/infra/docker-compose.yml"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "🚀 Tomo Verso Deploy"
echo "────────────────────"

# ── 1. Pacotes base ─────────────────────────────────────────
if command -v apt-get >/dev/null 2>&1; then
  echo "📦 Garantindo pacotes base..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y git curl ca-certificates
fi

# ── 2. Docker + Compose ─────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Instalando Docker..."
  curl -fsSL https://get.docker.com | $SUDO sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "🐳 Instalando Docker Compose plugin..."
  $SUDO apt-get install -y docker-compose-plugin
fi

# ── 3. Clonar/atualizar repositório ─────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "🔄 Atualizando repositório..."
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  echo "📥 Clonando repositório em $APP_DIR..."
  $SUDO mkdir -p "$APP_DIR"
  $SUDO chown -R "$(id -un):$(id -gn)" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 4. Env file ─────────────────────────────────────────────
# O compose injeta /opt/tomoverso/.env no container.
# Se não existir, cria vazio para o compose não falhar.
if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚠️  Criando .env vazio. Depois vamos preencher Mercado Pago/Auth/etc."
  cat > "$APP_DIR/.env" <<'EOF'
# Tomo Verso production env
# Preencher depois com AUTH_SECRET, ADMIN_SECRET_PATH, Mercado Pago etc.
EOF
fi

# ── 5. Firewall básico ──────────────────────────────────────
if command -v ufw >/dev/null 2>&1; then
  echo "🛡️  Liberando portas 22/80/443..."
  $SUDO ufw allow OpenSSH || true
  $SUDO ufw allow 80/tcp || true
  $SUDO ufw allow 443/tcp || true
fi

# ── 6. Build e restart ──────────────────────────────────────
echo "🏗️  Buildando aplicação..."
docker compose -f "$COMPOSE_FILE" build tomoverso

echo "🔄 Subindo serviços..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ── 7. Verificação ──────────────────────────────────────────
echo "⏳ Aguardando o app iniciar..."
sleep 20

APP_STATUS="$(docker inspect -f '{{.State.Health.Status}}' tomoverso 2>/dev/null || echo unknown)"
echo "Status do container: $APP_STATUS"

echo "📋 Últimos logs do app:"
docker compose -f "$COMPOSE_FILE" logs --tail=40 tomoverso || true

echo "📋 Containers:"
docker compose -f "$COMPOSE_FILE" ps

echo "✅ Deploy finalizado. Teste:"
echo "   http://40.116.106.139"
echo "   https://tomoversodn.northcentralus.cloudapp.azure.com"
echo "   https://tomoverso.studio (quando o DNS apontar)"
