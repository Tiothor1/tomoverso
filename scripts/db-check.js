const Database = require("better-sqlite3");
const db = new Database(process.argv[2], { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ? ORDER BY name").all("table").map(r => r.name);
console.log("TABLES (" + tables.length + "):", tables.join(", "));
const counts = {};
for (const t of tables) {
  try { counts[t] = db.prepare("SELECT COUNT(*) AS c FROM [" + t + "]").get().c; } catch (e) { counts[t] = "error"; }
}
console.log("ROW COUNTS:", JSON.stringify(counts, null, 2));
const ms = db.prepare("SELECT name, applied_at FROM migrations ORDER BY applied_at").all();
console.log("MIGRATIONS:", JSON.stringify(ms, null, 2));
db.close();
