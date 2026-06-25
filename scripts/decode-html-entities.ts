/**
 * Decodifica entidades HTML comuns que vieram de scrapers/imports.
 * Evita títulos como "Mo Shi Wei Wang &#8211; Rei do Apocalipse" aparecendo no site.
 */
import Database = require("better-sqlite3");

const db = new Database("data/tomoverso.db");

function decodeHtml(value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value
    .replace(/&amp;#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;([a-zA-Z]+);/g, "&$1;")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const updates = [
  { table: "mangas", cols: ["title", "synopsis", "author", "artist"] },
  { table: "manga_chapters", cols: ["title"] },
  { table: "novels", cols: ["title", "synopsis"] },
  { table: "chapters", cols: ["title"] },
];

let changed = 0;
const tx = db.transaction(() => {
  for (const { table, cols } of updates) {
    const rows = db.prepare(`SELECT id, ${cols.join(", ")} FROM ${table}`).all() as any[];
    for (const row of rows) {
      const next: Record<string, string> = {};
      for (const col of cols) {
        const before = row[col];
        const after = decodeHtml(before);
        if (typeof before === "string" && typeof after === "string" && before !== after) {
          next[col] = after;
        }
      }
      const entries = Object.entries(next);
      if (!entries.length) continue;
      const set = entries.map(([col]) => `${col} = ?`).join(", ");
      db.prepare(`UPDATE ${table} SET ${set} WHERE id = ?`).run(...entries.map(([, v]) => v), row.id);
      changed++;
    }
  }
});

tx();
console.log(`Registros normalizados: ${changed}`);

for (const table of ["mangas", "manga_chapters", "novels", "chapters"]) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c: any) => c.name).filter((n: string) => ["title", "synopsis", "author", "artist"].includes(n));
  const where = cols.map((c: string) => `${c} LIKE '%&#%' OR ${c} LIKE '%&amp;%'`).join(" OR ");
  const c = where ? (db.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${where}`).get() as any).c : 0;
  console.log(`${table}: entidades restantes=${c}`);
}

db.close();
