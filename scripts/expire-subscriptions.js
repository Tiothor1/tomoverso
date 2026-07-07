#!/usr/bin/env node
/**
 * Expira assinaturas vencidas — execução diária (cron)
 * Roda em produção: node scripts/expire-subscriptions.js
 */
const path = require("path");
const fs = require("fs");

// Determina caminho do banco
const PROD_DB = "/var/www/tomoverso/data-runtime/tomoverso.db";
const LOCAL_DB = path.join(__dirname, "..", "data", "tomoverso.db");

const dbPath = fs.existsSync(PROD_DB) ? PROD_DB : LOCAL_DB;

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  // tenta de node_modules do projeto
  const { execSync } = require("child_process");
  const nm = execSync(`node -e "console.log(require.resolve('better-sqlite3'))"`, { cwd: path.join(__dirname, "..") })
    .toString().trim();
  Database = require(nm);
}

const db = new Database(dbPath);

// 1. Expira assinaturas com período encerrado
const expireResult = db
  .prepare(
    `UPDATE user_subscriptions
     SET status = 'expired', updated_at = datetime('now')
     WHERE status = 'active'
       AND current_period_end < datetime('now')
       AND cancel_at_period_end = 1`
  )
  .run();

// 2. Também expira as que não têm cancel_at_period_end mas já venceram há mais de 1 dia (grace period)
const hardExpireResult = db
  .prepare(
    `UPDATE user_subscriptions
     SET status = 'expired', updated_at = datetime('now')
     WHERE status = 'active'
       AND current_period_end < datetime('now', '-1 days')
       AND cancel_at_period_end = 0`
  )
  .run();

console.log(
  JSON.stringify({
    expired_clean: expireResult.changes,
    expired_hard: hardExpireResult.changes,
    timestamp: new Date().toISOString(),
  })
);

db.close();
