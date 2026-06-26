/**
 * Import Portuguese fiction books from Project Gutenberg via Gutendex API.
 * 
 * Usage: npx tsx --tsconfig tsconfig.json scripts/import-gutenberg-books.ts
 */
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const API_BASE = "https://gutendex.com/books";
const COVERS_DIR = path.join(process.cwd(), "public", "uploads", "books", "covers");
const RATE_LIMIT_MS = 600;

interface GBook {
  id: number;
  title: string;
  authors: { name: string; birth_year?: number; death_year?: number }[];
  translators: { name: string }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  formats: Record<string, string>;
  download_count: number;
}

interface Chapter {
  number: number;
  title: string;
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch all Portuguese fiction books from Gutendex */
async function fetchAllBooks(): Promise<GBook[]> {
  const all: GBook[] = [];
  let next: string | null = `${API_BASE}/?languages=pt&topic=fiction`;

  while (next) {
    console.log(`[fetch] ${next}`);
    const res = await fetch(next);
    if (!res.ok) {
      console.error(`  FAILED: ${res.status}`);
      break;
    }
    const data = await res.json();
    const results: GBook[] = data.results || [];
    all.push(...results);
    console.log(`  Got ${results.length} books, total ${all.length}`);
    next = data.next;
    if (next) await sleep(RATE_LIMIT_MS);
  }

  return all;
}

/** Check if text likely contains entertainment content (not dictionary/academic) */
function isEntertainment(subjects: string[], title: string): boolean {
  const entertainment = [
    "fiction", "romance", "adventure", "novel", "conto", "poesia",
    "drama", "comédia", "infantil", "juvenile",
  ];
  const nonFiction = [
    "dictionary", "grammar", "linguistics", "philosophy", "religion",
    "history --", "science", "mathematics", "education", "biography",
  ];

  const subjectText = subjects.join(" ").toLowerCase();
  const titleLower = title.toLowerCase();

  // Skip clearly non-fiction
  for (const nf of nonFiction) {
    if (subjectText.includes(nf)) return false;
  }

  // Must match at least one entertainment category
  for (const en of entertainment) {
    if (subjectText.includes(en) || titleLower.includes(en)) return true;
  }

  // If it has "fiction" in subjects, accept it
  if (subjectText.includes("fiction")) return true;

  return false;
}

/** Strip Gutenberg header/footer boilerplate */
function cleanGutenbergText(raw: string): string {
  // Remove the Gutenberg header: from start to "*** START OF"
  let text = raw;
  const startMarker = text.match(/\*\*\*\s*START\s+OF\s+(THE\s+)?PROJECT\s+GUTENBERG/i);
  if (startMarker && startMarker.index !== undefined) {
    text = text.substring(startMarker.index + startMarker[0].length);
  }

  // Remove the Gutenberg footer: from "*** END OF" to end
  const endMarker = text.match(/\*\*\*\s*END\s+OF\s+(THE\s+)?PROJECT\s+GUTENBERG/i);
  if (endMarker && endMarker.index !== undefined) {
    text = text.substring(0, endMarker.index);
  }

  // Remove excessive blank lines
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{4,}/g, "\n\n\n");

  // Remove obvious header items (language, encoding, title line repeats)
  const lines = text.split("\n");
  let startIdx = 0;
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();
    if (
      line.startsWith("Language:") ||
      line.startsWith("Character set encoding:") ||
      line === "" ||
      line.match(/^\d+$/)
    ) {
      startIdx = i + 1;
    } else if (line.includes("***")) {
      startIdx = i + 1;
    }
  }
  text = lines.slice(startIdx).join("\n").trim();

  return text.trim();
}

/** Parse chapters from text */
function parseChapters(text: string): Chapter[] {
  // Try multiple chapter patterns
  const patterns = [
    /CAPÍTULO\s+([IVXLCDM]+|\d+)\s*[.:–\-]?\s*(.*?)(?=\n|$)/gmi,
    /CAPITULO\s+([IVXLCDM]+|\d+)\s*[.:–\-]?\s*(.*?)(?=\n|$)/gmi,
    /^([IVXLCDM]+)\.\s+(.+)$/gm,
    /PARTE\s+(PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|[IVXLCDM]+|\d+)/gmi,
  ];

  const chapters: Chapter[] = [];
  let remaining = text;

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const matches: { index: number; num: string; title: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(remaining)) !== null) {
      matches.push({ index: m.index, num: m[1].trim(), title: (m[2] || "").trim() });
    }

    if (matches.length >= 2) {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : remaining.length;
        const content = remaining.substring(start, end).trim();
        chapters.push({
          number: i + 1,
          title: `${matches[i].num} ${matches[i].title}`.trim(),
          content,
        });
      }
      break;
    }
  }

  return chapters;
}

async function downloadCover(url: string, filename: string): Promise<string | null> {
  if (!existsSync(COVERS_DIR)) {
    mkdirSync(COVERS_DIR, { recursive: true });
  }
  const ext = path.extname(new URL(url).pathname) || ".jpg";
  const dest = path.join(COVERS_DIR, `${filename}${ext}`);

  if (existsSync(dest)) return `/uploads/books/covers/${filename}${ext}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buffer);
    return `/uploads/books/covers/${filename}${ext}`;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Gutenberg Book Import ===");
  console.log("Fetching Portuguese fiction books...");
  const allBooks = await fetchAllBooks();
  console.log(`\nTotal PT books fetched: ${allBooks}`);

  // Filter for entertainment only
  const entertainment = allBooks.filter((b) => isEntertainment(b.subjects, b.title));
  console.log(`Entertainment books: ${entertainment.length}`);
  console.log(`Skipped (non-entertainment): ${allBooks.length - entertainment.length}`);

  const db = getDb();

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const book of entertainment) {
    const gid = book.id;

    // Check if already imported
    const existing = db.prepare("SELECT id FROM books WHERE source_url LIKE ?").get(`%gutenberg.org/ebooks/${gid}%`);

    // Also check by slug
    const slug = slugify(book.title);
    const existing2 = db.prepare("SELECT id FROM books WHERE slug = ?").get(slug);

    if (existing || existing2) {
      console.log(`  [skip] #${gid} "${book.title}" — already imported`);
      skipped++;
      continue;
    }

    // Find text URL
    let textUrl: string | null = null;
    for (const [key, val] of Object.entries(book.formats)) {
      if (typeof val === "string") {
        if (key.includes("text/plain") || key.includes("txt") || val.endsWith(".txt")) {
          textUrl = val;
          break;
        }
      }
    }

    if (!textUrl) {
      console.log(`  [skip] #${gid} "${book.title}" — no text format`);
      skipped++;
      continue;
    }

    // Download text
    console.log(`  [dl] #${gid} "${book.title}"...`);
    await sleep(500);
    let rawText: string;
    try {
      const res = await fetch(textUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rawText = await res.text();
    } catch (e: any) {
      console.log(`  [err] #${gid} — download failed: ${e.message}`);
      errors++;
      continue;
    }

    if (rawText.length < 1000) {
      console.log(`  [skip] #${gid} — too short (${rawText.length} chars)`);
      skipped++;
      continue;
    }

    // Clean text
    const cleaned = cleanGutenbergText(rawText);

    // Parse chapters
    const chapters = parseChapters(cleaned);

    // Authors
    const authorNames = book.authors.map((a) => a.name).join("; ");

    // Cover
    const coverUrl = book.formats["image/jpeg"] || "";
    let localCover = "";
    if (coverUrl) {
      localCover = (await downloadCover(coverUrl, slug)) || "";
      console.log(`    Cover: ${localCover || "failed"}`);
    }

    // Genres from subjects
    const subjects = book.subjects.filter(
      (s) => !s.toLowerCase().includes("fiction")
    );
    const genres = subjects.length > 0 ? subjects : ["Romance"];

    // Content: if there are chapters, store chaptered content; otherwise store cleaned text
    const storeContent =
      chapters.length >= 2
        ? chapters.map((ch) => ch.content).join("\n\n---\n\n")
        : cleaned;

    // Count approximate pages
    const wordCount = cleaned.split(/\s+/).length;
    const pageEstimate = Math.max(1, Math.ceil(wordCount / 300));

    // Insert into DB
    const id = randomUUID();
    const now = new Date().toISOString();
    try {
      db.prepare(
        `INSERT INTO books (id, slug, title, author, synopsis, content, cover_url, cover_local_path, genres, pages, source, source_url, is_featured, is_hidden, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        slug,
        book.title,
        authorNames || "Desconhecido",
        cleaned.substring(0, 500) || "",
        storeContent,
        coverUrl,
        localCover || null,
        JSON.stringify(genres.slice(0, 5)),
        pageEstimate,
        "Project Gutenberg",
        `https://www.gutenberg.org/ebooks/${gid}`,
        0,
        0,
        now,
        now
      );
      imported++;
      console.log(`  [ok] #${gid} — imported, ${pageEstimate} pages, ${chapters.length} chapters, ${cleaned.length} chars`);
    } catch (e: any) {
      console.log(`  [err] #${gid} — DB insert failed: ${e.message}`);
      errors++;
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Total available: ${allBooks.length}`);
  console.log(`Entertainment:    ${entertainment.length}`);
  console.log(`Imported:         ${imported}`);
  console.log(`Skipped:          ${skipped}`);
  console.log(`Errors:           ${errors}`);
  console.log(`DB total:          ${db.prepare("SELECT COUNT(*) as c FROM books").get()?.c}`);
}

main().catch(console.error);
