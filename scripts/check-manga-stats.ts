import Database = require("better-sqlite3");
const db = new Database("data/tomoverso.db");

// Top genres from manga catalog (we need to seed genre data)
const rows = db.prepare(`
  SELECT m.id, m.slug, m.title, m.synopsis,
         (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = m.id) AS chapter_count
  FROM mangas m
  ORDER BY m.updated_at DESC
`).all() as any[];

console.log("Total manga:", rows.length);
console.log("With chapters:", rows.filter(r => r.chapter_count > 0).length);

// Check for genres
const hasGenres = rows.filter(r => r.synopsis && r.synopsis.length > 0).length;
console.log("With synopsis:", hasGenres);

// Stats
const statusCounts: Record<string, number> = {};
for (const r of rows) {
  statusCounts[r.status || "unknown"] = (statusCounts[r.status || "unknown"] || 0) + 1;
}
console.log("Status counts:", JSON.stringify(statusCounts));
