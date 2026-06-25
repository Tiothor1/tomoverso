/**
 * Remove obras que prometem leitura mas não têm nada legível.
 * - Mangás: precisam ter ao menos 1 chapter com ao menos 1 page image/local_path.
 * - Novels/LN/VN: precisam ter ao menos 1 chapter com texto real.
 * Também remove capítulos/páginas vazios e arquivos de capa órfãos.
 */
import Database = require("better-sqlite3");
import { existsSync, readdirSync, unlinkSync } from "fs";
import { join } from "path";

const db = new Database("data/tomoverso.db");
db.pragma("foreign_keys = ON");

const coverDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
const removedCoverFiles: string[] = [];
function removeCover(slug: string) {
  if (!existsSync(coverDir)) return;
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".svg"]) {
    const p = join(coverDir, slug + ext);
    if (existsSync(p)) {
      unlinkSync(p);
      removedCoverFiles.push(slug + ext);
    }
  }
}

function count(sql: string, ...args: any[]) {
  return (db.prepare(sql).get(...args) as { c: number }).c;
}

const before = {
  mangas: count("SELECT COUNT(*) c FROM mangas"),
  mangaChapters: count("SELECT COUNT(*) c FROM manga_chapters"),
  mangaPages: count("SELECT COUNT(*) c FROM manga_pages"),
  novels: count("SELECT COUNT(*) c FROM novels"),
  chapters: count("SELECT COUNT(*) c FROM chapters"),
};

const tx = db.transaction(() => {
  // 1) Remove páginas de mangá sem URL/local_path.
  const emptyPages = db.prepare("DELETE FROM manga_pages WHERE coalesce(image_url, local_path, '') = ''").run().changes;

  // 2) Remove capítulos de mangá sem nenhuma página legível.
  const emptyMangaChapterIds = db.prepare(`
    SELECT ch.id FROM manga_chapters ch
    WHERE NOT EXISTS (
      SELECT 1 FROM manga_pages p
      WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> ''
    )
  `).all() as Array<{ id: string }>;
  if (emptyMangaChapterIds.length) {
    const placeholders = emptyMangaChapterIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM manga_chapters WHERE id IN (${placeholders})`).run(...emptyMangaChapterIds.map(r => r.id));
  }

  // 3) Remove mangás sem nenhum capítulo com páginas.
  const emptyMangas = db.prepare(`
    SELECT m.id, m.slug, m.title, m.source
    FROM mangas m
    WHERE NOT EXISTS (
      SELECT 1
      FROM manga_chapters ch
      JOIN manga_pages p ON p.chapter_id = ch.id
      WHERE ch.manga_id = m.id AND coalesce(p.image_url, p.local_path, '') <> ''
    )
  `).all() as Array<{ id: string; slug: string; title: string; source: string | null }>;

  if (emptyMangas.length) {
    const ids = emptyMangas.map(m => m.id);
    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`DELETE FROM manga_tags WHERE manga_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM manga_chapters WHERE manga_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM mangas WHERE id IN (${placeholders})`).run(...ids);
    for (const m of emptyMangas) removeCover(m.slug);
  }

  // 4) Remove capítulos textuais vazios.
  const emptyTextChapters = db.prepare(`
    SELECT id FROM chapters
    WHERE length(trim(coalesce(content, ''))) <= 30 AND coalesce(word_count, 0) <= 5
  `).all() as Array<{ id: string }>;
  if (emptyTextChapters.length) {
    const ids = emptyTextChapters.map(c => c.id);
    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`DELETE FROM bookmarks WHERE chapter_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM likes WHERE chapter_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM comments WHERE chapter_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM reading_progress WHERE chapter_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM chapters WHERE id IN (${placeholders})`).run(...ids);
  }

  // 5) Remove novels/LN/VN sem nenhum capítulo textual legível.
  const emptyNovels = db.prepare(`
    SELECT n.id, n.slug, n.title, n.type, n.source
    FROM novels n
    WHERE NOT EXISTS (
      SELECT 1 FROM chapters c
      WHERE c.novel_id = n.id
        AND (length(trim(coalesce(c.content, ''))) > 30 OR coalesce(c.word_count, 0) > 5)
    )
  `).all() as Array<{ id: string; slug: string; title: string; type: string; source: string | null }>;

  if (emptyNovels.length) {
    const ids = emptyNovels.map(n => n.id);
    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`DELETE FROM novel_tags WHERE novel_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM source_links WHERE novel_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM favorites WHERE novel_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM comments WHERE novel_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM reading_progress WHERE novel_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM volumes WHERE novel_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM chapters WHERE novel_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM novels WHERE id IN (${placeholders})`).run(...ids);
  }

  return { emptyPages, emptyMangaChapterIds, emptyMangas, emptyTextChapters, emptyNovels };
});

const result = tx();

// 6) Remove arquivos de capa que não são referenciados no DB.
let orphanCoverFiles = 0;
if (existsSync(coverDir)) {
  const used = new Set(
    (db.prepare("SELECT cover_local_path FROM mangas WHERE cover_local_path IS NOT NULL AND cover_local_path <> ''").all() as Array<{ cover_local_path: string }>).map(r => r.cover_local_path)
  );
  for (const f of readdirSync(coverDir).filter(f => !f.startsWith("."))) {
    const publicPath = `/uploads/mangas/locais/${f}`;
    if (!used.has(publicPath)) {
      unlinkSync(join(coverDir, f));
      orphanCoverFiles++;
    }
  }
}

const after = {
  mangas: count("SELECT COUNT(*) c FROM mangas"),
  readableMangas: count(`
    SELECT COUNT(DISTINCT m.id) c FROM mangas m
    JOIN manga_chapters ch ON ch.manga_id = m.id
    JOIN manga_pages p ON p.chapter_id = ch.id
    WHERE coalesce(p.image_url, p.local_path, '') <> ''
  `),
  mangaChapters: count("SELECT COUNT(*) c FROM manga_chapters"),
  emptyMangaChapters: count(`
    SELECT COUNT(*) c FROM manga_chapters ch
    WHERE NOT EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')
  `),
  mangaPages: count("SELECT COUNT(*) c FROM manga_pages"),
  novels: count("SELECT COUNT(*) c FROM novels"),
  readableNovels: count(`
    SELECT COUNT(DISTINCT n.id) c FROM novels n
    JOIN chapters c ON c.novel_id = n.id
    WHERE length(trim(coalesce(c.content, ''))) > 30 OR coalesce(c.word_count, 0) > 5
  `),
  chapters: count("SELECT COUNT(*) c FROM chapters"),
  emptyTextChapters: count("SELECT COUNT(*) c FROM chapters WHERE length(trim(coalesce(content, ''))) <= 30 AND coalesce(word_count, 0) <= 5"),
};

console.log(JSON.stringify({ before, removed: {
  emptyMangaPages: result.emptyPages,
  emptyMangaChapters: result.emptyMangaChapterIds.length,
  emptyMangas: result.emptyMangas.map(m => ({ slug: m.slug, title: m.title, source: m.source })),
  emptyTextChapters: result.emptyTextChapters.length,
  emptyNovels: result.emptyNovels.map(n => ({ slug: n.slug, title: n.title, type: n.type, source: n.source })),
  coverFilesForDeletedMangas: removedCoverFiles.length,
  orphanCoverFiles,
}, after }, null, 2));

db.close();
