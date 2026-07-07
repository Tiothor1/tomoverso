#!/usr/bin/env bash
set -e
cd /var/www/tomoverso

echo "=== Pull code ==="
git fetch origin main
git reset --hard origin/main

echo "=== Check env ==="
set -a
source .env.production
set +a
echo "Admin path configured: [${ADMIN_SECRET_PATH:+yes}]"

echo "=== Build ==="
rm -rf .next
npm run build

echo "=== Restart ==="
pm2 restart tomoverso --update-env
pm2 save
sleep 4

echo "=== Test ==="
ADMIN_URL="https://tomoverso.studio/${ADMIN_SECRET_PATH}"
curl -s -o /dev/null -w "Admin root: %{http_code}\n" "${ADMIN_URL}"
curl -s -o /dev/null -w "Admin users: %{http_code}\n" "${ADMIN_URL}/usuarios"
echo "=== DONE ==="
