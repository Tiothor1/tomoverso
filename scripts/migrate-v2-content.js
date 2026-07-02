/**
 * Migration v2 — Original Content & Curation
 *
 * Adds support for original/curated content:
 *   - catalog_controls: +is_original, +curation_label
 *   - contests: new table
 *   - contest_submissions: new table
 *   - novels: +is_original
 *   - mangas: +is_original
 *
 * Uso: node scripts/migrate-v2-content.js
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(process.cwd(), "data", "tomoverso.db");

function columnExists(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[migrate-v2] Banco não encontrado: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const currentVersion = db.pragma("user_version", { simple: true });
  console.log(`[migrate-v2] Versão atual do schema: ${currentVersion}`);

  if (currentVersion >= 2) {
    console.log("[migrate-v2] Schema já está na versão 2. Nada a fazer.");
    db.close();
    return;
  }

  const tx = db.transaction(() => {
    // ── catalog_controls ──
    if (!columnExists(db, "catalog_controls", "is_original")) {
      db.exec("ALTER TABLE catalog_controls ADD COLUMN is_original INTEGER DEFAULT 0");
      console.log("  ✓ catalog_controls.is_original adicionada");
    } else {
      console.log("  ⏭  catalog_controls.is_original já existe");
    }

    if (!columnExists(db, "catalog_controls", "curation_label")) {
      db.exec("ALTER TABLE catalog_controls ADD COLUMN curation_label TEXT");
      console.log("  ✓ catalog_controls.curation_label adicionada");
    } else {
      console.log("  ⏭  catalog_controls.curation_label já existe");
    }

    // ── novels ──
    if (!columnExists(db, "novels", "is_original")) {
      db.exec("ALTER TABLE novels ADD COLUMN is_original INTEGER DEFAULT 0");
      console.log("  ✓ novels.is_original adicionada");
    } else {
      console.log("  ⏭  novels.is_original já existe");
    }

    // ── mangas ──
    if (!columnExists(db, "mangas", "is_original")) {
      db.exec("ALTER TABLE mangas ADD COLUMN is_original INTEGER DEFAULT 0");
      console.log("  ✓ mangas.is_original adicionada");
    } else {
      console.log("  ⏭  mangas.is_original já existe");
    }

    // ── contests ──
    db.exec(`
      CREATE TABLE IF NOT EXISTS contests (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        rules TEXT NOT NULL DEFAULT '',
        prize TEXT NOT NULL DEFAULT '',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("  ✓ tabela contests criada");

    // ── contest_submissions ──
    db.exec(`
      CREATE TABLE IF NOT EXISTS contest_submissions (
        id TEXT PRIMARY KEY,
        contest_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        work_type TEXT NOT NULL CHECK (work_type IN ('novel', 'manga')),
        work_id TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("  ✓ tabela contest_submissions criada");

    // ── Atualiza a versão ──
    db.pragma("user_version = 2");
    console.log("  ✓ user_version atualizada para 2");
  });

  try {
    tx();
    console.log("\n[migrate-v2] Migration concluída com sucesso.");
  } catch (e) {
    console.error("\n[migrate-v2] ERRO durante a migration:", e.message);
    throw e;
  } finally {
    db.close();
  }
}

main();
