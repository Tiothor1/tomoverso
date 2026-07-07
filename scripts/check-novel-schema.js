const Database = require("better-sqlite3");
const db = new Database(process.argv[2] || "data-runtime/tomoverso.db", { readonly: true });

// Check novels table schema
const tables = ["novels", "mangas", "users", "user_access_controls"];
for (const name of tables) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (row) {
    console.log(`=== ${name} ===`);
    console.log(row.sql);
    console.log("");
  }
}

// Check how novels reference authors
console.log("=== Novels sample (first 3) ===");
const novels = db.prepare("SELECT id, title, author_id, author_name, artist FROM novels LIMIT 3").all();
console.log(JSON.stringify(novels, null, 2));

console.log("\n=== Mangas sample (first 3) ===");
const mangas = db.prepare("SELECT id, title, author_id, artist FROM mangas LIMIT 3").all();
console.log(JSON.stringify(mangas, null, 2));

// Check if anon authors are referenced
const anonIds = db.prepare("SELECT id FROM users WHERE username LIKE 'author-%' AND email LIKE '%@external.author'").all().map(r => r.id);
if (anonIds.length > 0) {
  const placeholders = anonIds.map(() => '?').join(',');
  const refNovels = db.prepare(`SELECT COUNT(*) as count FROM novels WHERE author_id IN (${placeholders})`).get(...anonIds);
  const refMangas = db.prepare(`SELECT COUNT(*) as count FROM mangas WHERE author_id IN (${placeholders})`).get(...anonIds);
  console.log(`\nAnon authors referenced in: ${refNovels.count} novels, ${refMangas.count} mangas`);
}

db.close();
