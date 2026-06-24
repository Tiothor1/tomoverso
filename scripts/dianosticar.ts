import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");

console.log("=== MANGÁS SEM CAPÍTULOS ===");
const noCaps = c.prepare(`
  SELECT m.slug, m.title, m.cover_url IS NOT NULL as has_cover, m.cover_local_path IS NOT NULL as has_local
  FROM mangas m
  LEFT JOIN manga_chapters mc ON mc.manga_id = m.id
  WHERE mc.id IS NULL
  ORDER BY m.title
`).all();
console.log(`Total sem capítulos: ${noCaps.length}`);
for (const m of noCaps) console.log(`  ${m.slug} | cover=${m.has_cover} local=${m.has_local} | ${m.title}`);

console.log("\n=== MANGÁS SEM COVER ===");
const noCover = c.prepare(`
  SELECT slug, title, cover_url
  FROM mangas
  WHERE cover_url IS NULL
  ORDER BY title
`).all();
console.log(`Total sem cover: ${noCover.length}`);
for (const m of noCover) console.log(`  ${m.slug} | ${m.title}`);

console.log("\n=== CAPÍTULOS SEM PÁGINAS ===");
const emptyCaps = c.prepare(`
  SELECT m.slug, m.title, mc.chapter_number
  FROM manga_chapters mc
  JOIN mangas m ON m.id = mc.manga_id
  LEFT JOIN manga_pages mp ON mp.chapter_id = mc.id
  WHERE mp.id IS NULL
  ORDER BY m.title, mc.chapter_number
  LIMIT 20
`).all();
console.log(`Total caps sem páginas (first 20): ${emptyCaps.length}`);
for (const m of emptyCaps) console.log(`  ${m.slug} cap ${m.chapter_number} | ${m.title}`);

console.log("\n=== MANGÁS COM POUCOS CAPS (<=3) ===");
const fewCaps = c.prepare(`
  SELECT m.slug, m.title, COUNT(mc.id) as cap_count,
    (SELECT MAX(chapter_number) FROM manga_chapters WHERE manga_id = m.id) as max_chap
  FROM mangas m
  LEFT JOIN manga_chapters mc ON mc.manga_id = m.id
  GROUP BY m.id
  HAVING cap_count <= 3
  ORDER BY cap_count
`).all();
console.log(`Total com <=3 caps: ${fewCaps.length}`);
for (const m of fewCaps) console.log(`  ${m.slug}: ${m.cap_count} caps (max ${m.max_chap}) | ${m.title}`);
