import Database from "better-sqlite3";

const c = new Database("data/tomoverso.db");

// 1. Delete empty chapter
const empty = c.prepare(`
  SELECT mc.id, m.slug, mc.chapter_number FROM manga_chapters mc
  JOIN mangas m ON m.id = mc.manga_id
  LEFT JOIN manga_pages mp ON mp.chapter_id = mc.id
  WHERE mp.id IS NULL
`).all() as Array<{id:string; slug:string; chapter_number:number}>;
console.log(`Caps vazios encontrados: ${empty.length}`);
for (const ch of empty) {
  c.prepare("DELETE FROM manga_pages WHERE chapter_id = ?").run(ch.id);
  c.prepare("DELETE FROM manga_chapters WHERE id = ?").run(ch.id);
  console.log(`  → removido cap ${ch.chapter_number} de ${ch.slug}`);
}

// 2. Remove mangas that are NOVELS (text-based, not real manga)
// These have "novel" in the title or "the-beginning-after-the-end-novel" pattern
const novelMangas = c.prepare(`
  SELECT id, slug, title FROM mangas
  WHERE slug LIKE '%-novel' OR slug LIKE '%novel%'
  OR title LIKE '%Novel%' OR title LIKE '%novel%'
`).all() as Array<{id:string; slug:string; title:string}>;
console.log(`\nMangás que são novels (texto): ${novelMangas.length}`);
for (const m of novelMangas) {
  c.prepare("DELETE FROM manga_tags WHERE manga_id = ?").run(m.id);
  c.prepare("DELETE FROM manga_pages WHERE chapter_id IN (SELECT id FROM manga_chapters WHERE manga_id = ?)").run(m.id);
  c.prepare("DELETE FROM manga_chapters WHERE manga_id = ?").run(m.id);
  c.prepare("DELETE FROM manga_import_log WHERE manga_slug = ?").run(m.slug);
  c.prepare("DELETE FROM mangas WHERE id = ?").run(m.id);
  console.log(`  → removido ${m.slug}: ${m.title}`);
}

// 3. Delete the common novels that snuck in from mangaonline
// (these are LIGHT NOVELS, not manga)
const lnList = [
  "the-beginning-after-the-end-novel",
  "rezero-kara-hajimeru-isekai-seikatsu",
  "youkoso-jitsuryoku-shijou-shugi-no-kyoushitsu-e",
];
for (const slug of lnList) {
  const existing = c.prepare("SELECT id, title FROM mangas WHERE slug = ?").get(slug) as any;
  if (existing) {
    c.prepare("DELETE FROM manga_tags WHERE manga_id = ?").run(existing.id);
    c.prepare("DELETE FROM manga_pages WHERE chapter_id IN (SELECT id FROM manga_chapters WHERE manga_id = ?)").run(existing.id);
    c.prepare("DELETE FROM manga_chapters WHERE manga_id = ?").run(existing.id);
    c.prepare("DELETE FROM mangas WHERE id = ?").run(existing.id);
    console.log(`  → removido LN: ${slug}: ${existing.title}`);
  }
}

// Count remaining
const count = c.prepare("SELECT COUNT(*) as n FROM mangas").get() as any;
console.log(`\nMangás restantes: ${count.n}`);

// Update seed
c.exec("VACUUM");
console.log("DB compactado");
