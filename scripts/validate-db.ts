/**
 * Script de validação pós-migration.
 * Verifica:
 * 1) Dados originais preservados (3 novels, 3 capítulos, 1 user)
 * 2) Novas colunas em novels
 * 3) CHECK expandido com 'visual-novel'
 * 4) Todas as novas tabelas existem
 * 5) Migrations registradas
 *
 * Rodar com: npx tsx scripts/validate-db.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "tomoverso.db");
const db = new Database(DB_PATH, { readonly: true });

function header(s: string) {
  console.log(`\n=== ${s} ===`);
}

let errors = 0;
function check(label: string, ok: boolean, detail?: string) {
  const icon = ok ? "✓" : "✗";
  console.log(`  ${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) errors++;
}

// 1) Dados originais preservados
header("DADOS ORIGINAIS");
const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
const novelCount = (db.prepare("SELECT COUNT(*) as c FROM novels").get() as any).c;
const chapterCount = (db.prepare("SELECT COUNT(*) as c FROM chapters").get() as any).c;
check("1 user", userCount === 1, `encontrado: ${userCount}`);
check("3 novels", novelCount === 3, `encontrado: ${novelCount}`);
check("3 capítulos", chapterCount === 3, `encontrado: ${chapterCount}`);

console.log("\n  Novels preservadas:");
for (const n of db.prepare("SELECT slug, title, type FROM novels ORDER BY created_at").all() as any[]) {
  console.log(`    [${n.type}] ${n.title}`);
}
console.log("\n  Capítulos preservados:");
for (const c of db.prepare("SELECT chapter_number, title, word_count FROM chapters ORDER BY chapter_number").all() as any[]) {
  console.log(`    Cap ${c.chapter_number}: ${c.title} (${c.word_count} palavras)`);
}

// 2) Colunas novas em novels
header("COLUNAS DE novels");
const novelCols = (db.prepare("PRAGMA table_info(novels)").all() as any[]).map((c) => c.name);
const expectedNewCols = ["source", "source_id", "source_url", "last_synced_at",
                         "cover_source_url", "cover_local_path", "external_score"];
for (const col of expectedNewCols) {
  check(`coluna novels.${col}`, novelCols.includes(col));
}
console.log(`\n  Total de colunas: ${novelCols.length} (esperado >= ${19 + expectedNewCols.length})`);

// 3) CHECK expandido
header("CHECK DE novels.type");
const tableSql = (db.prepare("SELECT sql FROM sqlite_master WHERE name='novels'").get() as any).sql;
check("'visual-novel' no CHECK", tableSql.includes("'visual-novel'"));

const checkMatch = tableSql.match(/CHECK \(type IN \(([^)]+)\)\)/);
if (checkMatch) {
  console.log(`  Valores: ${checkMatch[1]}`);
}

// 4) Novas tabelas
header("TABELAS");
const allTables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[])
  .map((r) => r.name);
const expectedNewTables = [
  "sources", "source_links", "volumes", "tags", "novel_tags",
  "sync_runs", "sync_errors", "migrations"
];
for (const tbl of expectedNewTables) {
  check(`tabela ${tbl}`, allTables.includes(tbl));
}
console.log(`\n  Total de tabelas: ${allTables.length}`);
console.log(`  Lista: ${allTables.join(", ")}`);

// 5) Migrations registradas
header("MIGRATIONS APLICADAS");
const migrations = db.prepare("SELECT * FROM migrations ORDER BY applied_at").all() as any[];
for (const m of migrations) {
  console.log(`  ${m.name} em ${m.applied_at}`);
}
check("migration 001 registrada", migrations.some((m) => m.name === "001_ingest_foundation"));

// 6) Tabelas de capítulos
header("COLUNAS DE chapters");
const chapCols = (db.prepare("PRAGMA table_info(chapters)").all() as any[]).map((c) => c.name);
check("capítulos tem volume_id", chapCols.includes("volume_id"));
check("capítulos tem source_url", chapCols.includes("source_url"));

// Resumo
console.log(`\n=== RESULTADO ===`);
console.log(`  Erros: ${errors}`);
console.log(errors === 0 ? "  ✅ TODOS OS CHECKS PASSARAM\n" : "  ❌ FALHAS ENCONTRADAS\n");

db.close();
process.exit(errors === 0 ? 0 : 1);
