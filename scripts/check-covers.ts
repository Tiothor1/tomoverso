import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");
const mangas = c.prepare("SELECT slug, title, cover_local_path, substr(cover_url,1,60) as curl FROM mangas ORDER BY title").all() as Array<{slug:string;title:string;cover_local_path:string|null;curl:string}>;

console.log("=== RESUMO PÓS-LIMPEZA ===");
console.log(`Total: ${mangas.length} mangás`);
const withLocal = mangas.filter(m => m.cover_local_path);
console.log(`Com capa local: ${withLocal.length}`);
const without = mangas.filter(m => !m.cover_local_path);
console.log(`Sem capa local: ${without.length}`);
if (without.length > 0) {
  for (const m of without) console.log(`  ${m.slug}`);
}
console.log("\nPrimeiros 5:");
for (const m of mangas.slice(0,5)) console.log(`  ${m.title.padEnd(50)} local=${m.cover_local_path ? '✅' : '❌'}`);
