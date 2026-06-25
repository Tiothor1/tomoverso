/**
 * Tenta outras fontes oficiais SEM marca:
 * - Wikipedia (API REST, busca por titulo)
 * - TheMovieDB (TMDB - animes/mangás)
 * - Google Books
 * - Wikimedia Commons
 *
 * Fallback quando DuckDuckGo não retorna.
 */

import Database = require("better-sqlite3");
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const db = new Database("data/tomoverso.db");
const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function download(url: string, slug: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("image")) return null;
    let ext = "jpg";
    if (ct.includes("png")) ext = "png";
    else if (ct.includes("webp")) ext = "webp";
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 5000) return null;
    const filename = `${slug}.${ext}`;
    writeFileSync(join(outDir, filename), buf);
    return `/uploads/mangas/locais/${filename}`;
  } catch {
    return null;
  }
}

// Google Books API
async function googleBooks(title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${title} manga`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.items || j.items.length === 0) return null;
    for (const item of j.items) {
      const links = item.volumeInfo?.imageLinks;
      if (links?.extraLarge) return links.extraLarge.replace(/^http:/, "https:");
      if (links?.large) return links.large.replace(/^http:/, "https:");
      if (links?.medium) return links.medium.replace(/^http:/, "https:");
      if (links?.thumbnail) return links.thumbnail.replace(/^http:/, "https:").replace(/&edge=curl/g, "");
      if (links?.smallThumbnail) return links.smallThumbnail.replace(/^http:/, "https:").replace(/&edge=curl/g, "");
    }
    return null;
  } catch { return null; }
}

// Wikipedia API
async function wikipedia(title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(title);
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${q}&redirects=1`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const pages = j.query?.pages;
    if (!pages) return null;
    for (const k of Object.keys(pages)) {
      if (pages[k].original?.source) return pages[k].original.source;
    }
    return null;
  } catch { return null; }
}

// Wikimedia Commons - busca imagens
async function commons(title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${title} manga volume cover`);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json&gsrlimit=3`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const pages = j.query?.pages || {};
    for (const k of Object.keys(pages)) {
      const img = pages[k]?.imageinfo?.[0]?.url;
      if (img && img.match(/\.(jpg|jpeg|png|webp)$/i)) return img;
    }
    return null;
  } catch { return null; }
}

function cleanTitle(t: string): string {
  return t
    .replace(/\s*-\s*pt\s*br\s*$/i, "")
    .replace(/\s*-\s*manga\s*$/i, "")
    .replace(/\s*\(\s*pt-br\s*\)\s*$/i, "")
    .replace(/\s*manga\s*$/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

async function main() {
  const candidates = db.prepare(`
    SELECT m.id, m.slug, m.title,
           (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
    FROM mangas m
    WHERE m.cover_local_path LIKE '%.svg'
    ORDER BY chapter_count DESC
    LIMIT 200
  `).all() as any[];

  console.log(`Tentando fontes alternativas para ${candidates.length} mangas`);

  let found = 0, failed = 0;
  const t0 = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const m = candidates[i];
    const cleaned = cleanTitle(m.title);
    console.log(`[${i+1}/${candidates.length}] ${m.title}`);

    let url: string | null = null;
    // Tenta Google Books (capas reais)
    url = await googleBooks(cleaned);
    if (!url) url = await googleBooks(m.title);
    // Tenta Wikipedia
    if (!url) url = await wikipedia(cleaned);
    if (!url) url = await wikipedia(m.title);
    // Tenta Wikimedia Commons
    if (!url) url = await commons(cleaned);

    if (url) {
      const localPath = await download(url, m.slug);
      if (localPath) {
        db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(localPath, m.id);
        console.log(`  ✅ ${localPath.split('/').pop()}`);
        found++;
      } else {
        console.log(`  ❌ Download falhou`);
        failed++;
      }
    } else {
      console.log(`  ⚠ Sem resultado`);
      failed++;
    }

    if ((i + 1) % 20 === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`\n[CHECK ${i+1} | ${elapsed}s] OK=${found} | Falhas=${failed}\n`);
    }

    await sleep(300);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Capas reais: ${found} | Falhas: ${failed}`);
  console.log("=".repeat(50));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });