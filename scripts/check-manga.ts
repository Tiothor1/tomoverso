import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");

console.log("=== Mangás importados ===");
const mangas = c
  .prepare("SELECT slug, title, status, (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = mangas.id) AS caps FROM mangas ORDER BY updated_at DESC")
  .all() as Array<{ slug: string; title: string; status: string; caps: number }>;
console.log(`Total: ${mangas.length}`);
for (const m of mangas) {
  console.log(`  ${m.slug.padEnd(55)} — ${m.caps.toString().padStart(3)} caps — ${m.title.slice(0, 50)}`);
}

console.log("\n=== Total capítulos ===");
console.log(c.prepare("SELECT COUNT(*) as n FROM manga_chapters").get());

console.log("\n=== Total páginas ===");
console.log(c.prepare("SELECT COUNT(*) as n FROM manga_pages").get());

console.log("\n=== Import log ===");
const logs = c
  .prepare("SELECT source, manga_slug, status, pages_imported, chapters_imported, error FROM manga_import_log ORDER BY id DESC LIMIT 10")
  .all();
for (const l of logs) {
  console.log(`  [${l.status}] ${l.manga_slug}: +${l.chapters_imported} caps, +${l.pages_imported} pages ${l.error ? '— ' + l.error.slice(0, 80) : ''}`);
}