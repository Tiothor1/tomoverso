/**
 * Teste E2E do forceSyncSourceAction — simula o que o painel admin faz
 * quando o admin clica "Sync 100" pra fonte VNDB.
 */

import { runSync } from "../src/lib/ingest";
import Database from "better-sqlite3";
import * as path from "path";

const dbPath = path.join(process.cwd(), "data", "tomoverso.db");

async function main() {
  console.log("=== Estado ANTES do sync ===\n");
  const db = new Database(dbPath);
  const before = (db.prepare("SELECT COUNT(*) c FROM novels WHERE source='vndb'").get() as any).c;
  const runsBefore = (db.prepare("SELECT COUNT(*) c FROM sync_runs WHERE mode='manual'").get() as any).c;
  console.log(`VNDB novels: ${before}`);
  console.log(`Sync runs (mode=manual): ${runsBefore}`);

  console.log("\n=== Rodando runSync (simula clique no botão 'Sync 100') ===\n");
  const result = await runSync({
    sourceName: "vndb",
    mode: "manual",
    limit: 100,
    pageSize: 100,
  });

  console.log("\n=== Resultado ===");
  console.log(JSON.stringify(result, null, 2));

  console.log("\n=== Estado DEPOIS do sync ===\n");
  const after = (db.prepare("SELECT COUNT(*) c FROM novels WHERE source='vndb'").get() as any).c;
  const runsAfter = (db.prepare("SELECT COUNT(*) c FROM sync_runs WHERE mode='manual'").get() as any).c;
  console.log(`VNDB novels: ${after} (delta: ${after - before})`);
  console.log(`Sync runs (mode=manual): ${runsAfter} (delta: ${runsAfter - runsBefore})`);

  // Verifica último run
  const lastRun = db.prepare(`
    SELECT * FROM sync_runs WHERE mode='manual' ORDER BY started_at DESC LIMIT 1
  `).get() as any;
  console.log(`\nÚltimo run:`);
  console.log(`  ID: ${lastRun.id}`);
  console.log(`  Status: ${lastRun.status}`);
  console.log(`  Found/Imported/Updated/Failed: ${lastRun.items_found}/${lastRun.items_imported}/${lastRun.items_updated}/${lastRun.items_failed}`);

  db.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
