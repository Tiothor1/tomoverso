import Database from "better-sqlite3";
import * as path from "path";

const db = new Database(path.join(process.cwd(), "data", "tomoverso.seed.db"), { readonly: true });

console.log("=== Capas por fonte ===");
for (const r of db.prepare(`
  SELECT source,
    COUNT(*) as total,
    SUM(CASE WHEN cover_url IS NOT NULL AND cover_url != '' THEN 1 ELSE 0 END) as com_capa
  FROM novels
  WHERE source IS NOT NULL
  GROUP BY source
`).all() as any[]) {
  const pct = Math.round(100 * r.com_capa / r.total);
  console.log(`  ${r.source.padEnd(12)} ${r.com_capa}/${r.total} (${pct}%)`);
}

console.log("\n=== Amostra de capas ===");
for (const r of db.prepare(`
  SELECT source, source_id, cover_url FROM novels
  WHERE source IS NOT NULL AND cover_url IS NOT NULL
  LIMIT 3
`).all() as any[]) {
  console.log(`  ${r.source}/${r.source_id}`);
  console.log(`    ${r.cover_url}`);
}

db.close();
