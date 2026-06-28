/**
 * Resincroniza capítulos e páginas de um mangá do mangaonline.blue.
 * Remove dados existentes e re-importa.
 * Uso: node scripts/resync-manga.js <slug>
 */

const { randomUUID } = require("crypto");
const path = require("path");
const Database = require("better-sqlite3");

const DB = new Database(path.join(process.cwd(), "data", "tomoverso.db"));
DB.pragma("journal_mode = WAL");

const BASE = "https://mangaonline.blue";
const SOURCE_NAME = "mangaonline.blue";

async function fetchHtml(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

function extractChapterImages(html) {
  const urls = [];
  const seen = new Set();
  // Try both orders of class and src
  const matches = [
    ...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*wp-manga-chapter-img[^"]*"/g),
    ...html.matchAll(/<img[^>]*class="[^"]*wp-manga-chapter-img[^"]*"[^>]*src="([^"]+)"/g),
  ];
  for (const m of matches) {
    let u = m[1].replace(/^\s+/, "").replace(/\s+$/, "");
    if (u && !seen.has(u)) { seen.add(u); urls.push(u); }
  }
  return urls;
}

async function resyncManga(mangaSlug) {
  console.log(`[${mangaSlug}] Iniciando ressincronização...`);

  // Get manga from DB
  const manga = DB.prepare("SELECT id, title FROM mangas WHERE source = ? AND source_id = ?").get(SOURCE_NAME, mangaSlug);
  if (!manga) { console.log(`Mangá não encontrado: ${mangaSlug}`); return; }
  console.log(`[${mangaSlug}] "${manga.title}" (${manga.id})`);

  // Get existing chapters
  const chapters = DB.prepare("SELECT id, chapter_number, slug, source_url FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number ASC").all(manga.id);
  console.log(`[${mangaSlug}] ${chapters.length} capítulos encontrados`);

  let totalPages = 0;
  let updatedChapters = 0;

  for (const ch of chapters) {
    // Get chapter page URL
    const chapterUrl = ch.source_url || `${BASE}/manga/${mangaSlug}/capitulo-${Math.floor(ch.chapter_number)}/`;
    
    try {
      console.log(`[${mangaSlug}] Capítulo ${ch.chapter_number}...`);
      const html = await fetchHtml(chapterUrl);
      const images = extractChapterImages(html);

      if (images.length > 0) {
        // Delete existing pages
        DB.prepare("DELETE FROM manga_pages WHERE chapter_id = ?").run(ch.id);

        // Insert new pages
        const insert = DB.prepare("INSERT INTO manga_pages (id, chapter_id, page_number, image_url) VALUES (?, ?, ?, ?)");
        const tx = DB.transaction(() => {
          images.forEach((url, i) => {
            insert.run(randomUUID(), ch.id, i + 1, url);
          });
        });
        tx();

        // Update page count
        DB.prepare("UPDATE manga_chapters SET page_count = ? WHERE id = ?").run(images.length, ch.id);

        totalPages += images.length;
        updatedChapters++;
        console.log(`  → ${images.length} páginas`);
      } else {
        console.log(`  → 0 páginas (capítulo vazio?)`);
      }

      // Rate limit: 1.5s entre requisições
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log(`  → ERRO: ${e.message}`);
    }
  }

  console.log(`\n[${mangaSlug}] Finalizado! ${updatedChapters}/${chapters.length} capítulos atualizados, ${totalPages} páginas no total.`);
  DB.close();
}

// Main
const slug = process.argv[2];
if (!slug) { console.log("Uso: node scripts/resync-manga.js <slug>"); process.exit(1); }
resyncManga(slug).catch(e => { console.error("Fatal:", e); process.exit(1); });
