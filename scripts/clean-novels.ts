import Database from "better-sqlite3";

const DB = "data/tomoverso.seed.db";
const db = new Database(DB);

// Find novels with NO chapters
const toDelete = db.prepare(`
  SELECT id, title FROM novels 
  WHERE id NOT IN (SELECT DISTINCT novel_id FROM chapters)
`).all();

console.log(`Novels sem capitulos: ${toDelete.length}`);

// Delete them
const del = db.prepare("DELETE FROM novels WHERE id NOT IN (SELECT DISTINCT novel_id FROM chapters)");
const result = del.run();
console.log(`Removidas: ${result.changes}`);

// Verify
const remaining = (db.prepare("SELECT COUNT(*) c FROM novels").get() as { c: number }).c;
const withCh = (db.prepare("SELECT COUNT(DISTINCT novel_id) c FROM chapters").get() as { c: number }).c;
console.log(`Agora: ${remaining} novels, ${withCh} com capitulos`);

// List remaining
const list = db.prepare("SELECT id, title FROM novels ORDER BY title").all();
list.forEach(n => console.log(` - ${n.id}: ${n.title}`));

db.pragma("wal_checkpoint(TRUNCATE)");
db.close();
