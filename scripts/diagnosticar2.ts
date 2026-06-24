import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");

// Mangás com 0 caps - verificar se são mangaonline
const zeros = c.prepare("SELECT slug, source, source_id, title FROM mangas WHERE id IN (SELECT m.id FROM mangas m LEFT JOIN manga_chapters mc ON mc.manga_id = m.id WHERE mc.id IS NULL)").all();
console.log("ZERO CAPS:");
for (const m of zeros) console.log(`  ${m.slug} | source=${m.source} | source_id=${m.source_id} | ${m.title}`);

// Caps vazios - quais mangas
const emptyCaps = c.prepare(`
  SELECT DISTINCT m.slug, m.source, m.source_id, m.title
  FROM manga_chapters mc
  JOIN mangas m ON m.id = mc.manga_id
  LEFT JOIN manga_pages mp ON mp.chapter_id = mc.id
  WHERE mp.id IS NULL
`).all();
console.log("\nMANGAS WITH EMPTY CHAPTERS:");
for (const m of emptyCaps) console.log(`  ${m.slug} | source=${m.source} | source_id=${m.source_id} | ${m.title}`);

// Mangas com <=3 caps - verificar se sao mangaonline
const few = c.prepare(`
  SELECT m.slug, m.source, m.source_id, m.title, COUNT(mc.id) as cap_count
  FROM mangas m
  LEFT JOIN manga_chapters mc ON mc.manga_id = m.id
  GROUP BY m.id
  HAVING cap_count <= 3
  ORDER BY cap_count
`).all();
console.log("\nMANGAS COM <=3 CAPS:");
for (const m of few) console.log(`  ${m.slug} | source=${m.source} | source_id=${m.source_id} | ${m.cap_count} caps | ${m.title}`);
