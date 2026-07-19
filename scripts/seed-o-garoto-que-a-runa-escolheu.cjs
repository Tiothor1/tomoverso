#!/usr/bin/env node
/* Creates or updates the serial novel in the standard Tomoverso novels/chapters flow.
 * Every content/originais/o-garoto-que-a-runa-escolheu/capitulo-NN.md file is imported.
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

const chapters = fs.readdirSync(contentDir)
  .map((file) => {
    const match = /^capitulo-(\d+)\.md$/i.exec(file);
    return match ? { file, number: Number(match[1]) } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.number - b.number)
  .map(({ number, file }) => {
    const raw = fs.readFileSync(path.join(contentDir, file), "utf8");
    const heading = new RegExp(`^#\\s+Capítulo\\s+${number}\\s+[—-]\\s+(.+?)\\s*$`, "m").exec(raw);
    if (!heading) throw new Error(`Expected a '# Capítulo ${number} — Título' heading in ${file}`);
    const content = raw.replace(/^#\s+[^\n]+\n\n/, "").trim();
    const wordCount = (content.match(/[\p{L}\p{N}’'-]+/gu) || []).length;
    const images = [...content.matchAll(/!\[[^\]]*\]\((\/uploads\/[^)]+)\)/g)].map((m) => m[1]);
    for (const image of images) {
      if (!fs.existsSync(path.join(root, "public", image))) {
        throw new Error(`Missing chapter image: ${image}`);
      }
    }
    return { number, title: heading[1].trim(), content, wordCount };
  });

if (!chapters.length) throw new Error(`No chapter files found in ${contentDir}`);
const expectedChapterTotal = 120;
if (chapters.length !== expectedChapterTotal) {
  throw new Error(`Expected ${expectedChapterTotal} chapter files, found ${chapters.length}`);
}
for (let index = 0; index < chapters.length; index += 1) {
  const expected = index + 1;
  if (chapters[index].number !== expected) {
    throw new Error(`Chapter sequence must be contiguous; expected ${expected}, found ${chapters[index].number}`);
  }
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
const adultMetadataColumns = [
  ["classification_rating", "TEXT DEFAULT NULL"],
  ["tone", "TEXT DEFAULT NULL"],
  ["subtitle", "TEXT DEFAULT NULL"],
  ["content_warnings", "TEXT DEFAULT NULL"],
];
let novelColumns = new Set(db.prepare("PRAGMA table_info(novels)").all().map((col) => col.name));
for (const [column, type] of adultMetadataColumns) {
  if (!novelColumns.has(column)) db.prepare(`ALTER TABLE novels ADD COLUMN ${column} ${type}`).run();
}
novelColumns = new Set(db.prepare("PRAGMA table_info(novels)").all().map((col) => col.name));
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
    "completed",
    JSON.stringify(["Fantasia", "Isekai", "Aventura", "Ação"]),
    JSON.stringify(["Runeterra", "Runas", "Ionia", "Original Tomoverso"]),
    0,
    1,
  ];
  if (novelColumns.has("is_original")) {
    fields.push("is_original");
    values.push(1);
  }
  const adultMetadata = {
    classification_rating: "18+",
    tone: "Fantasia sombria, horror psicológico e aventura",
    subtitle: "Uma marca rúnica abriu uma guerra entre mundos.",
    content_warnings: "Obra destinada a maiores de 18 anos. Contém violência gráfica, linguagem forte, morte e terror psicológico.",
  };
  for (const [field, value] of Object.entries(adultMetadata)) {
    if (novelColumns.has(field)) {
      fields.push(field);
      values.push(value);
    }
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
