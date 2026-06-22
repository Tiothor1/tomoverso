/**
 * Validação rápida pós-import VNDB.
 */

import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"), { readonly: true });

console.log("\n=== ESTATÍSTICAS PÓS-IMPORT ===\n");

console.log("Por tipo:");
for (const row of db.prepare("SELECT type, COUNT(*) as c FROM novels GROUP BY type").all() as any[]) {
  console.log(`  ${row.type.padEnd(15)} ${row.c}`);
}

console.log("\nPor source:");
for (const row of db.prepare("SELECT COALESCE(source, '(none)') as src, COUNT(*) as c FROM novels GROUP BY source").all() as any[]) {
  console.log(`  ${row.src.padEnd(15)} ${row.c}`);
}

console.log("\nÚltimas 10 novels importadas (mais recentes):");
for (const row of db.prepare(`
  SELECT slug, title, source, source_id, external_score, cover_url IS NOT NULL as has_cover
  FROM novels
  WHERE source = 'vndb'
  ORDER BY created_at DESC
  LIMIT 10
`).all() as any[]) {
  const score = row.external_score ? row.external_score.toFixed(1) : "?";
  console.log(`  [${row.source_id}] ${row.title} (score: ${score}, cover: ${row.has_cover ? "✓" : "✗"})`);
}

console.log("\nSource links:");
const linkCount = (db.prepare("SELECT COUNT(*) as c FROM source_links").get() as any).c;
console.log(`  Total: ${linkCount}`);

console.log("\nÚltima sync_run:");
const lastRun = db.prepare(`
  SELECT source_name, mode, status, items_found, items_imported, items_updated, items_skipped, items_failed, duration_ms, started_at, finished_at
  FROM sync_runs ORDER BY started_at DESC LIMIT 1
`).get() as any;
if (lastRun) {
  console.log(`  Source:   ${lastRun.source_name}`);
  console.log(`  Mode:     ${lastRun.mode}`);
  console.log(`  Status:   ${lastRun.status}`);
  console.log(`  Found:    ${lastRun.items_found}`);
  console.log(`  Imported: ${lastRun.items_imported}`);
  console.log(`  Updated:  ${lastRun.items_updated}`);
  console.log(`  Skipped:  ${lastRun.items_skipped}`);
  console.log(`  Failed:   ${lastRun.items_failed}`);
  console.log(`  Duration: ${lastRun.duration_ms}ms`);
  console.log(`  Started:  ${lastRun.started_at}`);
  console.log(`  Finished: ${lastRun.finished_at}`);
}

console.log("\nÚltimos sync_errors (se houver):");
const errors = db.prepare(`
  SELECT se.external_id, se.error_type, se.error_message, sr.source_name
  FROM sync_errors se
  JOIN sync_runs sr ON sr.id = se.run_id
  ORDER BY se.created_at DESC LIMIT 5
`).all() as any[];
if (errors.length === 0) {
  console.log("  (nenhum)");
} else {
  for (const e of errors) {
    console.log(`  [${e.source_name}/${e.external_id ?? "?"}] ${e.error_type}: ${e.error_message}`);
  }
}

db.close();
