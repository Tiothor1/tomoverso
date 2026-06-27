import { readFileSync, writeFileSync, mkdirSync } from "fs";
import * as path from "path";
import Database = require("better-sqlite3");

const ROOT = process.cwd();
const volumePath = path.join(ROOT, "data/novels/demon-king/volume-1.json");
const volume = JSON.parse(readFileSync(volumePath, "utf8"));
const db = new Database(path.join(ROOT, "data/tomoverso.db"));

function countWords(text: string): number {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean).length;
}

const novel = db.prepare("SELECT * FROM novels WHERE slug = ?").get(volume.slug) as any;
if (!novel) throw new Error(`Novel not found: ${volume.slug}`);
if (volume.chapters.length !== 20) throw new Error(`Expected 20 chapters, got ${volume.chapters.length}`);

const now = new Date().toISOString();
const tx = db.transaction(() => {
  db.prepare(`
    UPDATE novels
    SET title = ?, title_en = ?, title_jp = ?, synopsis = ?, genres = ?, tags = ?, status = 'completed',
        source = 'tomoverso-original', source_url = '', source_id = ?, is_featured = 1, updated_at = ?
    WHERE id = ?
  `).run(
    volume.title,
    volume.title,
    "",
    volume.synopsis,
    JSON.stringify(volume.genres),
    JSON.stringify(volume.tags),
    volume.slug,
    now,
    novel.id,
  );

  db.prepare("DELETE FROM chapters WHERE novel_id = ?").run(novel.id);

  const insert = db.prepare(`
    INSERT INTO chapters (id, novel_id, volume_id, chapter_number, title, content, word_count, views, source_url, published_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, 0, '', ?, ?)
  `);

  for (const chapter of volume.chapters) {
    insert.run(
      crypto.randomUUID(),
      novel.id,
      chapter.number,
      chapter.title,
      chapter.content,
      countWords(chapter.content),
      now,
      now,
    );
  }
});

tx();

const imported = db.prepare("SELECT chapter_number, title, word_count FROM chapters WHERE novel_id = ? ORDER BY chapter_number").all(novel.id);
const totalWords = imported.reduce((sum: number, c: any) => sum + c.word_count, 0);
const outDir = path.join(ROOT, "data/novels/demon-king");
mkdirSync(outDir, { recursive: true });
const manuscript = volume.chapters.map((chapter: any) => `Capítulo ${chapter.number}\n${chapter.title}\n\n${chapter.content}`).join("\n\n---\n\n");
writeFileSync(path.join(outDir, "manuscript.md"), manuscript, "utf8");

console.log(JSON.stringify({ slug: volume.slug, chapters: imported.length, totalWords, first: imported[0], last: imported[imported.length - 1] }, null, 2));
db.close();
