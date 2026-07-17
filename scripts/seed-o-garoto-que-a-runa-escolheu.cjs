#!/usr/bin/env node
/* Creates the illustrated novel in the standard Tomoverso novels/chapters flow.
 * Default target is the local ignored runtime DB. Pass DB_PATH to target another DB.
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const root = path.resolve(__dirname, "..");
const dbPath = process.env.DB_PATH || path.join(root, "data", "tomoverso.db");
const contentDir = path.join(root, "content", "originais", "o-garoto-que-a-runa-escolheu");
const novelId = "original-o-garoto-que-a-runa-escolheu";
const slug = "o-garoto-que-a-runa-escolheu";
const authorId = "fabio-texeira-2026";

const chapters = [
  [1, "A pior ideia da noite", "capitulo-01.md"],
  [2, "A floresta que escuta", "capitulo-02.md"],
  [3, "O homem que coleciona ruínas", "capitulo-03.md"],
  [4, "A dívida de Luan", "capitulo-04.md"],
  [5, "O caminho que Luan escondeu", "capitulo-05.md"],
].map(([number, title, file]) => {
  const raw = fs.readFileSync(path.join(contentDir, file), "utf8");
  const content = raw.replace(/^#\s+[^\n]+\n\n/, "").trim();
  const wordCount = (content.match(/[\p{L}\p{N}’'-]+/gu) || []).length;
  const images = [...content.matchAll(/!\[[^\]]*\]\((\/uploads\/[^)]+)\)/g)].map((m) => m[1]);
  for (const image of images) {
    if (!fs.existsSync(path.join(root, "public", image))) {
      throw new Error(`Missing chapter image: ${image}`);
    }
  }
  return { number, title, content, wordCount };
});

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
const novelColumns = new Set(db.prepare("PRAGMA table_info(novels)").all().map((col) => col.name));
if (!db.prepare("SELECT 1 FROM users WHERE id = ?").get(authorId)) {
  throw new Error(`Author ${authorId} was not found in ${dbPath}`);
}

const upsert = db.transaction(() => {
  const fields = ["id", "slug", "title", "alternative_titles", "synopsis", "cover_url", "cover_local_path", "author_id", "source", "type", "status", "genres", "tags", "is_featured", "is_approved"];
  const values = [
    novelId,
    slug,
    "O Garoto Que a Runa Escolheu",
    JSON.stringify(["The Boy the Rune Chose"]),
    "Caio Vilar, um adolescente brasileiro de quinze anos, é arrancado do próprio quarto por uma ruptura rúnica e desperta nas ruínas de Ionia. Sem saber por que uma marca o escolheu, ele precisa sobreviver ao lado de Luan — outro brasileiro preso em Runeterra — enquanto Ryze investiga quem abriu uma passagem entre mundos.",
    "/uploads/novels/original/o-garoto-que-a-runa-escolheu-cover.png",
    "/uploads/novels/original/o-garoto-que-a-runa-escolheu-cover.png",
    authorId,
    "tomoverso",
    "light-novel",
    "ongoing",
    JSON.stringify(["Fantasia", "Isekai", "Aventura", "Ação"]),
    JSON.stringify(["Runeterra", "Runas", "Ionia", "Original Tomoverso"]),
    0,
    1,
  ];
  if (novelColumns.has("is_original")) {
    fields.push("is_original");
    values.push(1);
  }
  const assignments = fields.filter((field) => field !== "id").map((field) => `${field} = excluded.${field}`).join(", ");
  db.prepare(`INSERT INTO novels (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")}) ON CONFLICT(id) DO UPDATE SET ${assignments}, updated_at = datetime('now')`).run(...values);

  const chapterStmt = db.prepare(`
    INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(novel_id, chapter_number) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      word_count = excluded.word_count,
      updated_at = datetime('now')
  `);
  for (const chapter of chapters) {
    chapterStmt.run(`${novelId}-chapter-${chapter.number}`, novelId, chapter.number, chapter.title, chapter.content, chapter.wordCount);
  }
});

try {
  upsert();
  const novel = db.prepare("SELECT id, slug, title, cover_url, is_approved FROM novels WHERE id = ?").get(novelId);
  const insertedChapters = db.prepare("SELECT chapter_number, title, word_count, LENGTH(content) AS chars FROM chapters WHERE novel_id = ? ORDER BY chapter_number").all(novelId);
  console.log(JSON.stringify({ dbPath, novel, chapters: insertedChapters }, null, 2));
} finally {
  db.close();
}
