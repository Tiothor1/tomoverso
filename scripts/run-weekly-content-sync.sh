#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f data/tomoverso.seed.db.gz ]; then
  echo "[tomoverso-sync] data/tomoverso.seed.db.gz não encontrado"
  exit 1
fi

echo "[tomoverso-sync] Atualizando repo..."
git pull --ff-only origin main

echo "[tomoverso-sync] Hidratando SQLite a partir do seed versionado..."
mkdir -p data
gzip -dc data/tomoverso.seed.db.gz > data/tomoverso.db
rm -f data/tomoverso.db-wal data/tomoverso.db-shm

if [ ! -d node_modules ]; then
  echo "[tomoverso-sync] Instalando dependências..."
  npm install --no-package-lock --no-audit --no-fund
fi

echo "[tomoverso-sync] Rodando sync incremental..."
npm run sync:weekly -- \
  --max-novels="${MAX_NOVELS:-80}" \
  --max-mangas="${MAX_MANGAS:-120}" \
  --max-new-novels="${MAX_NEW_NOVELS:-5}" \
  --max-new-mangas="${MAX_NEW_MANGAS:-5}" \
  --catalog-pages="${CATALOG_PAGES:-10}" \
  --max-novel-chapters-per-run="${MAX_NOVEL_CHAPTERS_PER_RUN:-2}" \
  --max-new-novel-chapters="${MAX_NEW_NOVEL_CHAPTERS:-5}" \
  --max-chapters-new-manga="${MAX_CHAPTERS_NEW_MANGA:-80}" \
  --sleep-ms="${SYNC_SLEEP_MS:-1200}"

echo "[tomoverso-sync] Preparando seed compactado..."
npm run seed:prepare

echo "[tomoverso-sync] Validando build..."
npm run build

git add data/tomoverso.seed.db.gz public/uploads 2>/dev/null || true
if git diff --cached --quiet; then
  echo "[tomoverso-sync] Nenhuma novidade detectada."
  exit 0
fi

git commit -m "chore: weekly content sync"
git push origin main

echo "[tomoverso-sync] Atualização enviada: $(git rev-parse --short HEAD)"
