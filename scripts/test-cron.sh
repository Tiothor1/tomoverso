#!/bin/bash
SECRET="cron-secret-test-3000"
BASE="http://localhost:3000"

echo "=== TESTE 1: sem auth header (esperado 401) ==="
curl -sS -w "\nHTTP %{http_code}\n" "$BASE/api/cron/sync-weekly"

echo ""
echo "=== TESTE 2: auth errado (esperado 401) ==="
curl -sS -w "\nHTTP %{http_code}\n" -H "Authorization: Bearer senhaerrada" "$BASE/api/cron/sync-weekly"

echo ""
echo "=== TESTE 3: auth correto (esperado 200) ==="
curl -sS -w "\nHTTP %{http_code} | %{time_total}s\n" -H "Authorization: Bearer $SECRET" "$BASE/api/cron/sync-weekly"

echo ""
echo "=== TESTE 4: sync-chapters com auth correto (esperado 200) ==="
curl -sS -w "\nHTTP %{http_code} | %{time_total}s\n" -H "Authorization: Bearer $SECRET" "$BASE/api/cron/sync-chapters"
