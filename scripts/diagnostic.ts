import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");

console.log("=== MANGÁS SEM COVER ===");
const noCover = c.prepare("SELECT slug, title, cover_url FROM mangas WHERE cover_url IS NULL OR cover_url = ''").all();
console.log(`Total sem cover: ${noCover.length}`);
for (const m of noCover) console.log(`  ${m.slug} | ${m.title}`);

console.log("\n=== MANGÁS COM TÍTULO EM JP/KR ===");
// Check for Japanese/Korean characters (Unicode ranges)
const all = c.prepare("SELECT slug, title FROM mangas ORDER BY title").all() as Array<{slug:string;title:string}>;
const nonLatins = all.filter(m => /[\u3000-\u9fff\uac00-\ud7af]/.test(m.title));
console.log(`Total com caracteres JP/KR: ${nonLatins.length}`);
for (const m of nonLatins.slice(0,20)) console.log(`  ${m.slug} | ${m.title}`);

console.log("\n=== CAPÍTULOS DE MANGÁS QUE SÓ TÊM TEXTO (0 páginas) ===");
const textOnly = c.prepare(`
  SELECT m.slug, m.title, mc.chapter_number, mc.title as ch_title
  FROM manga_chapters mc
  JOIN mangas m ON m.id = mc.manga_id
  LEFT JOIN manga_pages mp ON mp.chapter_id = mc.id
  WHERE mp.id IS NULL
  GROUP BY m.slug
`).all() as Array<{slug:string;title:string;chapter_number:number;ch_title:string}>;
const uniqueSlugs = new Set(textOnly.map(m => m.slug));
console.log(`Total mangás com caps sem páginas: ${uniqueSlugs.size}`);
for (const slug of uniqueSlugs) {
  const caps = textOnly.filter(m => m.slug === slug).map(m => m.chapter_number);
  console.log(`  ${slug}: caps ${caps.slice(0,10).join(', ')}${caps.length > 10 ? '...' : ''}`);
}

console.log("\n=== MANGÁS DO KAKUYOMU (JP text) - que não são mangá de verdade ===");
// These are in the novels table, not mangas
