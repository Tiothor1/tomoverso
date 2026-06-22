import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"), { readonly: true });

console.log("=".repeat(50));
console.log("RESUMO PÓS-ETAPA 3");
console.log("=".repeat(50));

const total = (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c;
console.log(`\n📚 Catálogo total: ${total} novels`);

console.log("\n📊 Por tipo:");
for (const r of db.prepare("SELECT type, COUNT(*) c FROM novels GROUP BY type ORDER BY c DESC").all() as any[]) {
  console.log(`  ${r.type.padEnd(15)} ${r.c}`);
}

console.log("\n🌐 Por fonte:");
for (const r of db.prepare("SELECT COALESCE(source, '(seed)') as src, COUNT(*) c FROM novels GROUP BY source ORDER BY c DESC").all() as any[]) {
  console.log(`  ${r.src.padEnd(15)} ${r.c}`);
}

const hasCover = (db.prepare("SELECT COUNT(*) c FROM novels WHERE cover_url IS NOT NULL").get() as any).c;
const hasSyn = (db.prepare("SELECT COUNT(*) c FROM novels WHERE synopsis IS NOT NULL AND synopsis != ''").get() as any).c;
const hasGenres = (db.prepare("SELECT COUNT(*) c FROM novels WHERE genres != '[]'").get() as any).c;
const hasScore = (db.prepare("SELECT COUNT(*) c FROM novels WHERE external_score IS NOT NULL").get() as any).c;

console.log("\n📈 Cobertura de dados:");
console.log(`  Cover:    ${hasCover}/${total} (${Math.round(100*hasCover/total)}%)`);
console.log(`  Synopsis: ${hasSyn}/${total} (${Math.round(100*hasSyn/total)}%)`);
console.log(`  Genres:   ${hasGenres}/${total} (${Math.round(100*hasGenres/total)}%)`);
console.log(`  Score:    ${hasScore}/${total} (${Math.round(100*hasScore/total)}%)`);

console.log("\n📈 Sync runs (últimos 3):");
for (const r of db.prepare("SELECT source_name, mode, status, items_found, items_imported, items_updated, duration_ms FROM sync_runs ORDER BY started_at DESC LIMIT 3").all() as any[]) {
  console.log(`  [${r.mode.padEnd(8)}] ${r.source_name.padEnd(10)} ${r.status.padEnd(8)} found=${r.items_found} imp=${r.items_imported} upd=${r.items_updated} ${r.duration_ms}ms`);
}

const linkCount = (db.prepare("SELECT COUNT(*) c FROM source_links").get() as any).c;
const errCount = (db.prepare("SELECT COUNT(*) c FROM sync_errors").get() as any).c;
console.log(`\n🔗 Source links: ${linkCount}`);
console.log(`❌ Sync errors: ${errCount}`);

console.log("\n🏆 Top 5 VNs por score:");
for (const r of db.prepare("SELECT title, external_score, source_id FROM novels WHERE source='vndb' ORDER BY external_score DESC LIMIT 5").all() as any[]) {
  console.log(`  ${r.title} (${r.source_id}) — ${r.external_score?.toFixed(1)}`);
}

db.close();
