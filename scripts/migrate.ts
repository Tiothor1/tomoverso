/**
 * Migration runner — descobre e aplica migrations em ordem.
 *
 * Uso: npx tsx scripts/migrate.ts [up|down|status]
 *
 * Cada migration é um arquivo em scripts/migrations/ que exporta
 * { name, up(db), down(db) }. As migrations aplicadas ficam registradas
 * na tabela `migrations` do próprio banco.
 */

import Database from "better-sqlite3";
import { readdirSync, existsSync, mkdirSync, copyFileSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const DB_PATH =
  process.env.DB_PATH ||
  path.join(
    process.env.VERCEL ? "/tmp/tomoverso" : process.cwd(),
    "data",
    "tomoverso.db"
  );

async function main() {
  // Garante que o diretório existe
  const dbDir = path.dirname(DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log(`[migrate] Diretório criado: ${dbDir}`);
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Carrega migrations já aplicadas (a tabela pode ainda não existir — daí o try)
  const appliedSet = new Set<string>();
  try {
    const rows = db.prepare(`SELECT name FROM migrations`).all() as Array<{ name: string }>;
    for (const r of rows) appliedSet.add(r.name);
  } catch {
    // Tabela não existe ainda — primeira execução
  }

  // Descobre migrations no diretório
  const migrationsDir = path.join(process.cwd(), "scripts", "migrations");
  if (!existsSync(migrationsDir)) {
    console.error(`[migrate] Diretório de migrations não encontrado: ${migrationsDir}`);
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();

  const command = process.argv[2] || "up";

  if (command === "status") {
    console.log("\n[STATUS DAS MIGRATIONS]\n");
    console.log(`DB: ${DB_PATH}\n`);
    for (const f of files) {
      const migrationName = f.replace(/\.(ts|js)$/, "");
      const applied = appliedSet.has(migrationName);
      console.log(`  ${applied ? "✓" : "○"} ${migrationName}`);
    }
    console.log("");
    db.close();
    process.exit(0);
  }

  if (command === "up") {
    // Auto-backup antes de aplicar migrations (proteção extra)
    if (existsSync(DB_PATH)) {
      const backupsDir = path.join(path.dirname(DB_PATH), "backups");
      if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupsDir, `tomoverso.auto-backup.${ts}.db`);
      try {
        copyFileSync(DB_PATH, backupPath);
        const shm = DB_PATH + "-shm";
        const wal = DB_PATH + "-wal";
        if (existsSync(shm)) copyFileSync(shm, backupPath + "-shm");
        if (existsSync(wal)) copyFileSync(wal, backupPath + "-wal");
        console.log(`[migrate] Backup automático: ${backupPath}`);
      } catch (e: any) {
        console.warn(`[migrate] Aviso: falha no auto-backup: ${e.message}`);
      }
    }

    // Detecta se a migration precisa de FKs OFF (recriação de tabelas com FKs).
    // A migration exporta `requiresForeignKeysOff: true` para indicar isso.
    // IMPORTANTE: PRAGMA foreign_keys só funciona FORA de uma transaction.

    console.log(`\n[migrate] Aplicando migrations em: ${DB_PATH}\n`);
    let appliedCount = 0;

    for (const f of files) {
      const migrationName = f.replace(/\.(ts|js)$/, "");
      if (appliedSet.has(migrationName)) {
        console.log(`  ⏭  ${migrationName} (já aplicada)`);
        continue;
      }

      console.log(`  → Aplicando ${migrationName}...`);
      const t0 = Date.now();

      // Import dinâmico da migration (suporta TS via tsx). No Windows,
      // absolute paths precisam ser convertidos para file:// URL.
      const migration = await import(pathToFileURL(path.join(migrationsDir, f)).href);

      if (typeof migration.up !== "function") {
        console.error(`    ✗ Migration ${migrationName} não exporta up(db)`);
        process.exit(1);
      }

      // Se a migration precisa desabilitar FKs, fazer ANTES da transaction.
      const needsFkOff = migration.requiresForeignKeysOff === true;

      try {
        if (needsFkOff) {
          db.pragma("foreign_keys = OFF");
        }

        const tx = db.transaction(() => {
          migration.up(db);
        });
        tx();

        if (needsFkOff) {
          db.pragma("foreign_keys = ON");
        }

        console.log(`    ✓ OK (${Date.now() - t0}ms)`);
        appliedCount++;
      } catch (e: any) {
        console.error(`    ✗ ERRO: ${e.message}`);
        console.error(e.stack);

        // Tenta restaurar FKs mesmo em caso de erro
        if (needsFkOff) {
          try { db.pragma("foreign_keys = ON"); } catch {}
        }
        process.exit(1);
      }
    }

    console.log(`\n[migrate] Concluído. ${appliedCount} migration(s) aplicada(s).\n`);
    db.close();
    process.exit(0);
  }

  if (command === "down") {
    console.log(`\n[migrate] Reverter última migration em: ${DB_PATH}\n`);
    const lastApplied = files
      .map((f) => f.replace(/\.(ts|js)$/, ""))
      .filter((n) => appliedSet.has(n))
      .pop();

    if (!lastApplied) {
      console.log("  Nenhuma migration para reverter.\n");
      db.close();
      process.exit(0);
    }

    console.log(`  → Revertendo ${lastApplied}...`);
    const migration = await import(pathToFileURL(path.join(migrationsDir, `${lastApplied}.ts`)).href);

    if (typeof migration.down !== "function") {
      console.error(`    ✗ Migration ${lastApplied} não exporta down(db)`);
      process.exit(1);
    }

    try {
      const tx = db.transaction(() => {
        migration.down(db);
      });
      tx();
      console.log(`    ✓ Revertida\n`);
      db.close();
      process.exit(0);
    } catch (e: any) {
      console.error(`    ✗ ERRO: ${e.message}`);
      console.error(e.stack);
      db.close();
      process.exit(1);
    }
  }

  console.error(`Comando desconhecido: ${command}. Use: up | down | status`);
  db.close();
  process.exit(1);
}

main().catch((e) => {
  console.error("[migrate] ERRO FATAL:", e);
  process.exit(1);
});
