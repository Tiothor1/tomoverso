const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.cwd(), 'data', 'tomoverso.db');
const PREVIEW = '/previews/cicatrizario-abismo';

const MANGA = {
  id: randomUUID(),
  slug: 'cicatrizario-do-abismo',
  title: 'Cicatrizário do Abismo',
  alternativeTitle: 'O Herói F-0 que Aprendeu a Cobrar a Dor',
  synopsis: `Ren Avel é invocado como herói no reino de Arvhal e recebe a única bênção considerada inútil: "Cicatrizário — Registro de Feridas", classe F-0. Ridicularizado, usado como isca e traído pelos próprios heróis, ele descobre que toda dor registrada se torna uma dívida — e o abismo cobra juros.`,
  author: 'Fábio Teixeira (Tiothor1)',
  artist: 'Pollo GPT Image 2 (geração)',
  coverLocal: `${PREVIEW}/final-blocks/block-01.jpg`,
  status: 'ongoing',
  source: 'original',
  tags: ['Isekai', 'Dark Fantasy', 'Vingança', 'Poder Oculto', 'Protagonista Fraco', 'Sistema de Dívida'],
};

const CHAPTERS = [
  {
    chapterNumber: 1,
    title: 'O Herói F-0',
    slug: 'capitulo-1',
    blocks: 20,
  },
];

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Verifica se já existe
const existing = db.prepare(`SELECT id, slug FROM mangas WHERE slug = ?`).get(MANGA.slug);
if (existing) {
  console.log(`Manga "${MANGA.title}" já existe (id=${existing.id}), pulando.`);
  process.exit(0);
}

// 1. Insere manga
db.prepare(`
  INSERT INTO mangas (id, slug, title, alternative_titles, synopsis, cover_url, cover_local_path, author, artist, status, source, source_id, source_url, last_synced_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`).run(
  MANGA.id,
  MANGA.slug,
  MANGA.title,
  JSON.stringify([MANGA.alternativeTitle]),
  MANGA.synopsis,
  null,
  MANGA.coverLocal,
  MANGA.author,
  MANGA.artist,
  MANGA.status,
  MANGA.source,
  MANGA.slug,
  null,
);
console.log(`Manga "${MANGA.title}" inserido (id=${MANGA.id})`);

// 2. Tags
const insertTag = db.prepare(`INSERT OR IGNORE INTO manga_tags (manga_id, tag) VALUES (?, ?)`);
for (const tag of MANGA.tags) insertTag.run(MANGA.id, tag);
console.log(`${MANGA.tags.length} tags inseridas`);

// 3. Capítulo 1
const ch = CHAPTERS[0];
const chId = randomUUID();
const chSlug = ch.slug;
db.prepare(`
  INSERT INTO manga_chapters (id, manga_id, chapter_number, title, slug, page_count, published_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
`).run(chId, MANGA.id, ch.chapterNumber, ch.title, chSlug, ch.blocks);
console.log(`Capítulo ${ch.chapterNumber} "${ch.title}" inserido (id=${chId}, ${ch.blocks} páginas)`);

// 4. Páginas (blocos 01..20)
const insertPage = db.prepare(`
  INSERT INTO manga_pages (id, chapter_id, page_number, image_url, local_path, width, height)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
let ok = 0;
for (let i = 1; i <= ch.blocks; i++) {
  const num = String(i).padStart(2, '0');
  const localPath = `${PREVIEW}/final-blocks/block-${num}.jpg`;
  const absPath = path.join(process.cwd(), 'public', localPath);
  if (!fs.existsSync(absPath)) {
    console.log(`  [WARN] Bloco ${num} não encontrado: ${absPath}`);
    continue;
  }
  insertPage.run(randomUUID(), chId, i, localPath, localPath, 1080, 1920);
  ok++;
}
console.log(`${ok}/${ch.blocks} páginas inseridas`);

// 5. Summary
const countManga = db.prepare(`SELECT COUNT(*) c FROM mangas`).get();
const countCh = db.prepare(`SELECT COUNT(*) c FROM manga_chapters`).get();
const countPg = db.prepare(`SELECT COUNT(*) c FROM manga_pages`).get();
console.log(`\nResumo: ${countManga.c} mangás · ${countCh.c} capítulos · ${countPg.c} páginas`);

db.close();
console.log(`\nLink: https://tomoverso.vercel.app/manga/${MANGA.slug}`);
