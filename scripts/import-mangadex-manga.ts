/**
 * Importa mangás do MangaDex para o sistema de mangás do Tomoverso.
 *
 * Estratégia:
 *   - Busca mangás com tradução PT-BR, ordenados por popularidade
 *   - Para cada mangá: cria registro + capítulos + páginas
 *   - Usa mesma estrutura (mangas / manga_chapters / manga_pages)
 *   - Respeita rate limit da API (5 req/s)
 *
 * Uso: npx tsx scripts/import-mangadex-manga.ts [--limit=200] [--resume]
 */

import Database = require("better-sqlite3");
import { randomUUID } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const CHECKPOINT_FILE = join(process.cwd(), "data", "md-import-checkpoint.json");

const argv = process.argv.slice(2);
const limit = parseInt(argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "200", 10);
const resumeMode = argv.includes("--resume");

const BASE = "https://api.mangadex.org";
const UA = "Tomoverso/1.0";

function ts() { return new Date().toLocaleTimeString("pt-BR"); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

let apiCalls = 0;
let apiLimitReset = Date.now();
const RATE_LIMIT = 4; // calls per second

async function mdFetch(url: string): Promise<any> {
  apiCalls++;
  if (apiCalls >= RATE_LIMIT) {
    const wait = Math.max(0, apiLimitReset - Date.now() + 200);
    if (wait > 0) await sleep(wait);
    apiCalls = 0;
    apiLimitReset = Date.now() + 1000;
  }
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`MangaDex HTTP ${r.status}: ${r.statusText}`);
  return r.json();
}

function safeStr(v: any, fallback = ""): string {
  if (!v) return fallback;
  if (typeof v === "string") return v;
  return v.en || v["pt-br"] || v.ja || Object.values(v)[0] as string || fallback;
}

type MangaRow = {
  id: string;
  slug: string;
  title: string;
  alt_titles: string;
  synopsis: string;
  cover_url: string | null;
  cover_local_path: string | null;
  author: string | null;
  artist: string | null;
  status: string;
  source: string;
  source_id: string;
  source_url: string | null;
};

async function importMangaDexManga(mangaId: string, db: Database.Database) {
  const startTime = Date.now();

  // Get manga details
  const data = await mdFetch(`${BASE}/manga/${mangaId}?includes[]=author&includes[]=artist&includes[]=cover_art`);
  const attr = data.data.attributes;
  const title = safeStr(attr.title, mangaId);

  const altTitles = (attr.altTitles || []).map((t: any) => Object.values(t)[0]).filter(Boolean);
  const description = safeStr(attr.description, "").slice(0, 3000);
  const statusMap: Record<string, string> = { ongoing: "ongoing", completed: "completed", hiatus: "hiatus", cancelled: "dropped" };
  const status = statusMap[attr.status] || "ongoing";

  // Tags/genres
  const tags = (attr.tags || []).map((t: any) => safeStr(t.attributes?.name)).filter(Boolean);

  // Author/Artist
  let author = null, artist = null;
  for (const rel of data.data.relationships || []) {
    if (rel.type === "author") author = rel.attributes?.name || author;
    if (rel.type === "artist") artist = rel.attributes?.name || artist;
  }

  // Cover art
  let coverUrl = null;
  for (const rel of data.data.relationships || []) {
    if (rel.type === "cover_art" && rel.attributes?.fileName) {
      coverUrl = `https://uploads.mangadex.org/covers/${mangaId}/${rel.attributes.fileName}.512.jpg`;
    }
  }

  const slug = `md-${mangaId.slice(0, 8)}`;

  // Check if exists
  const existing = db.prepare("SELECT id FROM mangas WHERE source='mangadex' AND source_id=?").get(mangaId) as any;
  let mangaRowKey: string;

  if (existing) {
    mangaRowKey = existing.id;
    db.prepare(`
      UPDATE mangas SET title=?, alternative_titles=?, synopsis=?, cover_url=?, author=?, artist=?, status=?, updated_at=datetime('now')
      WHERE id=?
    `).run(title, JSON.stringify(altTitles), description, coverUrl, author, artist, status, mangaRowKey);
  } else {
    mangaRowKey = randomUUID();
    db.prepare(`
      INSERT INTO mangas (id, slug, title, alternative_titles, synopsis, cover_url, author, artist, status, source, source_id, source_url, last_synced_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'mangadex', ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `).run(mangaRowKey, slug, title, JSON.stringify(altTitles), description, coverUrl, author, artist, status, mangaId, `https://mangadex.org/title/${mangaId}`);
  }

  // Insert tags
  try {
    db.prepare("DELETE FROM manga_tags WHERE manga_id=?").run(mangaRowKey);
    for (const tag of tags) {
      db.prepare("INSERT OR IGNORE INTO manga_tags (manga_id, tag) VALUES (?, ?)").run(mangaRowKey, tag);
    }
  } catch {}

  // Get chapters (PT-BR)
  const chapters: Array<{ id: string; num: number; title: string | null }> = [];
  let cursor: string | null = null;
  while (true) {
    const url = `${BASE}/chapter?manga=${mangaId}&translatedLanguage[]=pt-br&limit=100&order[chapter]=asc${cursor ? `&offset=${cursor}` : ""}`;
    const chData = await mdFetch(url);
    for (const ch of chData.data || []) {
      chapters.push({
        id: ch.id,
        num: parseFloat(ch.attributes.chapter) || 0,
        title: ch.attributes.title || null,
      });
    }
    const total = chData.total || 0;
    const offset = (chData.offset || 0) + (chData.data?.length || 0);
    if (offset >= total) break;
    cursor = String(offset);
  }

  let chaptersAdded = 0;
  let pagesAdded = 0;

  for (const ch of chapters) {
    // Check if chapter exists
    const existingCh = db.prepare("SELECT id FROM manga_chapters WHERE manga_id=? AND chapter_number=?").get(mangaRowKey, ch.num) as any;
    if (existingCh) continue;

    const chId = randomUUID();
    const chSlug = `capitulo-${ch.num}`;
    const chSourceUrl = `https://mangadex.org/chapter/${ch.id}`;

    // Create chapter
    db.prepare(`
      INSERT INTO manga_chapters (id, manga_id, chapter_number, title, slug, source_url, page_count)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(chId, mangaRowKey, ch.num, ch.title || `Capítulo ${ch.num}`, chSlug, chSourceUrl);
    chaptersAdded++;

    // Get chapter pages
    try {
      const server = await mdFetch(`${BASE}/at-home/server/${ch.id}`);
      await sleep(100); // extra delay for CDN
      const baseUrl = server.baseUrl;
      const hash = server.chapter.hash;
      const pageFiles = server.chapter.data || [];
      
      for (let i = 0; i < pageFiles.length; i++) {
        const imgUrl = `${baseUrl}/data/${hash}/${pageFiles[i]}`;
        db.prepare(`
          INSERT OR IGNORE INTO manga_pages (id, chapter_id, page_number, image_url)
          VALUES (?, ?, ?, ?)
        `).run(randomUUID(), chId, i + 1, imgUrl);
        pagesAdded++;
      }

      // Update page count
      db.prepare("UPDATE manga_chapters SET page_count=? WHERE id=?").run(pageFiles.length, chId);

      if (pagesAdded % 100 === 0) {
        process.stdout.write(".");
      }
    } catch (e: any) {
      // Chapter might fail - skip
      continue;
    }
  }

  return { isNew: !existing, chaptersAdded, pagesAdded, totalChapters: chapters.length, time: Date.now() - startTime };
}

async function main() {
  const db = new Database("data/tomoverso.db");
  
  // Load checkpoint
  let importedIds = new Set<string>();
  if (resumeMode && existsSync(CHECKPOINT_FILE)) {
    const saved = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf8")) as string[];
    importedIds = new Set(saved);
    console.log(`[${ts()}] Resume mode: ${importedIds.size} já importados`);
  }

  // Also check DB for already imported
  const dbImported = (db.prepare("SELECT source_id FROM mangas WHERE source='mangadex'").all() as any[]).map((r) => r.source_id);
  for (const id of dbImported) importedIds.add(id);
  console.log(`[${ts()}] Mangadex mangas já no DB: ${dbImported.length}`);

  // Get top PT-BR manga
  let toImport: Array<{ id: string; title: string }> = [];
  let totalAvailable = 0;

  for (let page = 0; toImport.length < limit + 50; page++) {
    const offset = page * 50;
    if (offset > 5000) break; // MangaDex pagination limit
    
    const url = `${BASE}/manga?limit=50&offset=${offset}&availableTranslatedLanguage[]=pt-br&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
    const data = await mdFetch(url);
    totalAvailable = data.total || 0;
    
    for (const m of data.data || []) {
      const id = m.id;
      if (!importedIds.has(id)) {
        const t = safeStr(m.attributes.title, id);
        toImport.push({ id, title: t });
      }
    }
    
    console.log(`[${ts()}] Página ${page + 1}: coletados ${toImport.length} novos mangás (total disponível: ${totalAvailable})`);
    
    if (!data.data?.length || data.data.length < 50) break;
  }

  console.log(`\n[${ts()}] Total disponível (PT-BR): ${totalAvailable}`);
  console.log(`[${ts()}] Já importados: ${importedIds.size}`);
  console.log(`[${ts()}] Para importar agora: ${Math.min(toImport.length, limit)}`);

  if (toImport.length === 0) {
    console.log("Nada a importar.");
    process.exit(0);
  }

  toImport = toImport.slice(0, limit);

  let imported = 0, failed = 0;
  let totalCaps = 0, totalPags = 0;
  const t0 = Date.now();

  for (let i = 0; i < toImport.length; i++) {
    const m = toImport[i];
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`\n[${ts()}] [${i + 1}/${toImport.length}] (+${elapsed}s) ${m.title.slice(0, 60)}`);

    try {
      const result = await importMangaDexManga(m.id, db);
      importedIds.add(m.id);
      imported++;
      totalCaps += result.chaptersAdded;
      totalPags += result.pagesAdded;
      const kind = result.isNew ? "NOVO" : "ATUALIZADO";
      console.log(`  ✓ ${kind} | +${result.chaptersAdded} caps | +${result.pagesAdded} pags | ${(result.time/1000).toFixed(1)}s`);

      // Save checkpoint every 10
      if ((i + 1) % 10 === 0) {
        writeFileSync(CHECKPOINT_FILE, JSON.stringify(Array.from(importedIds)), "utf8");
        const rate = (totalCaps + totalPags) / ((Date.now() - t0) / 1000);
        console.log(`\n[CHECKPOINT ${i+1}/${toImport.length}] ${imported} mangas | +${totalCaps} caps | +${totalPags} pags | ${rate.toFixed(1)} itens/s\n`);
      }
    } catch (e: any) {
      console.error(`  ✗ ERRO: ${e.message.slice(0, 120)}`);
      failed++;
    }
  }

  // Save final checkpoint
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(Array.from(importedIds)), "utf8");

  const finalMangas = (db.prepare("SELECT COUNT(*) AS c FROM mangas WHERE source='mangadex'").get() as any).c;
  const finalChapters = (db.prepare("SELECT COUNT(*) AS c FROM manga_chapters WHERE manga_id IN (SELECT id FROM mangas WHERE source='mangadex')").get() as any).c;
  const finalPages = (db.prepare("SELECT COUNT(*) AS c FROM manga_pages WHERE chapter_id IN (SELECT id FROM manga_chapters WHERE manga_id IN (SELECT id FROM mangas WHERE source='mangadex'))").get() as any).c;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const allMangas = (db.prepare("SELECT COUNT(*) AS c FROM mangas").get() as any).c;
  const allChapters = (db.prepare("SELECT COUNT(*) AS c FROM manga_chapters").get() as any).c;
  const allPages = (db.prepare("SELECT COUNT(*) AS c FROM manga_pages").get() as any).c;

  console.log(`\n${"=".repeat(60)}`);
  console.log("RESUMO FINAL");
  console.log("=".repeat(60));
  console.log(`  Mangadex importados:       ${imported}`);
  console.log(`  Falhas:                    ${failed}`);
  console.log(`  Caps adicionados:          ${totalCaps}`);
  console.log(`  Pags adicionadas:          ${totalPags}`);
  console.log(`  Tempo:                     ${elapsed}s`);
  console.log(``);
  console.log(`  TOTAL NO BANCO:`);
  console.log(`  Mangadex no DB:            ${finalMangas}`);
  console.log(`  Mangadex caps:             ${finalChapters}`);
  console.log(`  Mangadex pags:             ${finalPages}`);
  console.log(`  ────────────────────`);
  console.log(`  TODAS FONTES:`);
  console.log(`  Mangas total:              ${allMangas}`);
  console.log(`  Capitulos total:           ${allChapters}`);
  console.log(`  Paginas total:             ${allPages}`);
  console.log("=".repeat(60));

  process.exit(failed > 20 ? 2 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
