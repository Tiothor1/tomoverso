import Database from "better-sqlite3";
import * as path from "path";

const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"), { readonly: true });

console.log("=== Painel admin — estado das fontes ===\n");

const sources = db.prepare("SELECT id, name, display_name, type, rate_limit_per_sec, enabled, last_run_status, last_run_at FROM sources ORDER BY name").all() as any[];

for (const s of sources) {
  console.log(`📦 ${s.display_name} (${s.name})`);
  console.log(`   ID: ${s.id.slice(0, 8)}...`);
  console.log(`   Tipo: ${s.type} | Rate: ${s.rate_limit_per_sec} req/s`);
  console.log(`   Enabled: ${s.enabled ? "Sim" : "Não"}`);
  console.log(`   Last run: ${s.last_run_at ?? "(nunca)"} | Status: ${s.last_run_status ?? "—"}`);

  // Stats
  const novelCount = (db.prepare("SELECT COUNT(*) c FROM novels WHERE source=?").get(s.name) as any).c;
  const linkCount = (db.prepare("SELECT COUNT(*) c FROM source_links sl JOIN sources s ON s.id=sl.source_id WHERE s.name=?").get(s.name) as any).c;
  console.log(`   Novels: ${novelCount} | Source links: ${linkCount}`);
  console.log();
}

// Top 10 novels por score (mistura fontes)
console.log("\n=== Top 10 novels (qualquer fonte) ===");
for (const r of db.prepare(`
  SELECT title, type, source, external_score
  FROM novels
  WHERE external_score IS NOT NULL
  ORDER BY external_score DESC
  LIMIT 10
`).all() as any[]) {
  console.log(`  ${r.title} [${r.source}/${r.type}] — ${r.external_score?.toFixed(1)}`);
}

db.close();
