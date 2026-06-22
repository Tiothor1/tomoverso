import Database from "better-sqlite3";
import * as path from "path";

const db = new Database(path.join(process.cwd(), "data", "tomoverso.seed.db"), { readonly: true });

console.log("=== Usuários ===");
for (const r of db.prepare("SELECT id, username, role FROM users").all() as any[]) {
  console.log(`  ${r.username} (${r.id}) — ${r.role}`);
}

console.log("\n=== Novels do author_id='fabio-texeira-2026' ===");
for (const r of db.prepare(`
  SELECT slug, title, type, source
  FROM novels WHERE author_id = 'fabio-texeira-2026'
`).all() as any[]) {
  console.log(`  ${r.slug} [${r.type}] (${r.source})`);
}

console.log("\n=== Capítulos de OQEDE no DB ===");
for (const r of db.prepare(`
  SELECT id, chapter_number, title, word_count FROM chapters WHERE novel_id = 'o-que-eu-desenhei-existe'
`).all() as any[]) {
  console.log(`  cap ${r.chapter_number}: ${r.title} (${r.word_count}p)`);
}

db.close();
