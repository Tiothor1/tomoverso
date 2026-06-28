/**
 * Resincroniza em lote todos os mangás quebrados do mangaonline.blue.
 * Uso: node scripts/batch-resync.js [limite]
 * Ex: node scripts/batch-resync.js 10  (só 10 mangás)
 */

const { randomUUID } = require("crypto");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = path.join(process.cwd(), "data", "tomoverso.db");
const DB = new Database(DB_PATH);
DB.pragma("journal_mode = WAL");

const BASE = "https://mangaonline.blue";
const SOURCE_NAME = "mangaonline.blue";
const DELAY_MS = 1500;

async function fetchHtml(url, retries = 3) {
  for (let a = 1; a <= retries; a++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (a === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * a));
    }
  }
}

function extractImages(html) {
  const urls = [], seen = new Set();
  const m1 = [...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*wp-manga-chapter-img[^"]*"/g)];
  const m2 = [...html.matchAll(/<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="([^"]+)"/g)];
  for (const m of [...m1, ...m2]) {
    let u = m[1].replace(/^\s+/, "").replace(/\s+$/, "");
    if (u && !seen.has(u)) { seen.add(u); urls.push(u); }
  }
  return urls;
}

async function resyncManga(mangaSlug, mangaTitle) {
  const manga = DB.prepare("SELECT id FROM mangas WHERE source = ? AND source_id = ?").get(SOURCE_NAME, mangaSlug);
  if (!manga) return { slug: mangaSlug, error: "not found" };

  const chapters = DB.prepare("SELECT id, chapter_number, source_url FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number ASC").all(manga.id);
  let totalPages = 0, updated = 0, errors = 0;

  for (const ch of chapters) {
    const url = ch.source_url || `${BASE}/manga/${mangaSlug}/capitulo-${Math.floor(ch.chapter_number)}/`;
    try {
      const html = await fetchHtml(url);
      const images = extractImages(html);
      if (images.length > 0) {
        DB.prepare("DELETE FROM manga_pages WHERE chapter_id = ?").run(ch.id);
        const insert = DB.prepare("INSERT INTO manga_pages (id, chapter_id, page_number, image_url) VALUES (?, ?, ?, ?)");
        const tx = DB.transaction(() => { images.forEach((u, i) => insert.run(randomUUID(), ch.id, i + 1, u)); });
        tx();
        DB.prepare("UPDATE manga_chapters SET page_count = ? WHERE id = ?").run(images.length, ch.id);
        totalPages += images.length;
        updated++;
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    } catch (e) {
      errors++;
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }
  return { slug: mangaSlug, title: mangaTitle, chapters: chapters.length, updated, pages: totalPages, errors };
}

async function main() {
  const limit = parseInt(process.argv[2] || "999");
  console.log(`=== BATCH RESYNC === limite: ${limit} mangás\n`);

  // Get mangas sorted by most broken
  const mangas = DB.prepare(`
    SELECT m.slug, m.title, COUNT(ch.id) as ch_count
    FROM mangas m
    JOIN manga_chapters ch ON ch.manga_id = m.id
    WHERE m.source = 'mangaonline.blue'
    GROUP BY m.id
    HAVING AVG(CASE WHEN (SELECT COUNT(*) FROM manga_pages p WHERE p.chapter_id=ch.id) <= 2 THEN 1.0 ELSE 0 END) > 0.5
    ORDER BY ch_count DESC
  `).all();

  console.log(`Total quebrados: ${mangas.length}\n`);
  const toProcess = mangas.slice(0, limit);
  let completed = 0;

  for (const m of toProcess) {
    completed++;
    console.log(`[${completed}/${toProcess.length}] ${m.slug} (${m.ch_count} caps)...`);
    const result = await resyncManga(m.slug, m.title);
    if (result.error) {
      console.log(`  → ERRO: ${result.error}`);
    } else {
      console.log(`  → ${result.updated}/${result.chapters} caps, ${result.pages} páginas${result.errors > 0 ? `, ${result.errors} erros` : ''}`);
    }
  }

  console.log(`\n=== FINALIZADO: ${completed} mangás processados ===`);
  DB.close();
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
