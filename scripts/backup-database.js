#!/usr/bin/env node
/**
 * Backup automático do banco Tomoverso
 * Copia o DB atual para data-runtime/backups/ com timestamp
 * Mantém últimos 7 backups
 */
const path = require("path");
const fs = require("fs");

const PROD_DB = "/var/www/tomoverso/data-runtime/tomoverso.db";
const PROD_BACKUP_DIR = "/var/www/tomoverso/data-runtime/backups";

const dbPath = fs.existsSync(PROD_DB) ? PROD_DB : path.join(__dirname, "..", "data", "tomoverso.db");
const backupDir = fs.existsSync(PROD_DB) ? PROD_BACKUP_DIR : path.join(__dirname, "..", "data", "backups");

// Garante diretório de backup
fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `tomoverso.${timestamp}.db`);

// Verifica WAL e checkpoint antes de copiar
let Database;
try {
  Database = require("better-sqlite3");
} catch {
  const { execSync } = require("child_process");
  const nm = execSync(`node -e "console.log(require.resolve('better-sqlite3'))"`, { cwd: __dirname })
    .toString().trim();
  Database = require(nm);
}

const db = new Database(dbPath);
db.pragma("wal_checkpoint(TRUNCATE)");
db.close();

// Copia
fs.copyFileSync(dbPath, backupPath);

// Remove backups com mais de 7 dias
const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
const files = fs.readdirSync(backupDir);
let removed = 0;
for (const file of files) {
  if (file.startsWith("tomoverso.") && file.endsWith(".db") && file !== path.basename(backupPath)) {
    const filePath = path.join(backupDir, file);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < cutoff) {
      // Remove related WAL/SHM too
      for (const ext of [".db", ".db-wal", ".db-shm"]) {
        const related = filePath.replace(/\.db$/, ext);
        if (fs.existsSync(related)) fs.unlinkSync(related);
      }
      removed++;
    }
  }
}

console.log(
  JSON.stringify({
    backup_path: backupPath,
    backup_size: fs.statSync(backupPath).size,
    rotated_deleted: removed,
    total_backups: fs.readdirSync(backupDir).filter((f) => f.endsWith(".db")).length,
    timestamp: new Date().toISOString(),
  })
);
