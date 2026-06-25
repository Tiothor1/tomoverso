/**
 * Importa mangás do lermangas.me (WordPress Madara).
 * Mesma estrutura do mangaonline.blue.
 *
 * Uso: npx tsx scripts/import-lermangas.ts [--pages=100] [--max-chapters=9999]
 */

import Database = require("better-sqlite3");
import { randomUUID } from "crypto";

const argv = process.argv.slice(2);
const MAX_PAGES = parseInt(argv.find(a=>a.startsWith("--pages="))?.split("=")[1]||"100", 10);
const MAX_CHAPTERS = parseInt(argv.find(a=>a.startsWith("--max-chapters="))?.split("=")[1]||"9999", 10);
const START_FROM = parseInt(argv.find(a=>a.startsWith("--start-from="))?.split("=")[1]||"1", 10);

const BASE = "https://lermangas.me";
const SOURCE = "lermangas.me";
const db = new Database("data/tomoverso.db");

function ts() { return new Date().toLocaleTimeString("pt-BR"); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let apiCalls = 0;
async function fetchHtml(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      apiCalls++;
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (r.status === 404) throw new Error("404");
      if (!r.ok && attempt === retries) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) { await sleep(2000 * attempt); continue; }
      return await r.text();
    } catch (e: any) {
      if (attempt === retries) throw e;
      await sleep(1500 * attempt);
    }
  }
  throw new Error("unreachable");
}

function extractSlugs(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const regex = /href=["']https?:\/\/lermangas\.me\/manga\/([a-z0-9-]{10,80})(?:\/|["'])/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const slug = m[1];
    if (!seen.has(slug) && slug.length > 5 && !slug.includes("page") && !slug.includes("wp-") && !slug.includes("feed") && !slug.includes("search")) {
      seen.add(slug);
      results.push(slug);
    }
  }
  return results;
}

function extractCover(html: string): string | null {
  const m = html.match(/class=["']img-responsive["'][^>]*src=["']([^"']+)["']/);
  if (m) return m[1].replace(/-\d+x\d+\.(jpg|jpeg|png|webp)$/, ".$1");
  const og = html.match(/<meta property=["']og:image["'][^>]*content=["']([^"']+)["']/);
  return og?.[1] || null;
}

function extractTitle(html: string): string {
  return html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() || "";
}

function extractSynopsis(html: string): string {
  const s = html.match(/<div[^>]*class=["']summary__content["'][^>]*>([\s\S]*?)<\/div>/);
  if (s) return s[1].replace(/<[^>]+>/g, "").trim().slice(0, 3000);
  const d = html.match(/<meta name=["']description["'] content=["']([^"']+)["']/);
  return d?.[1]?.trim()?.slice(0, 3000) || "";
}

function extractAuthor(html: string): string | null {
  const a = html.match(/Autor[^<]*<[^>]*class=["']summary-content["'][^>]*>([^<]+)/);
  return a?.[1]?.trim() || null;
}

function extractChapters(html: string, slug: string): Array<{num:number;slug:string;title:string|null}> {
  const chapters: Array<{num:number;slug:string;title:string|null}> = [];
  const regex = new RegExp(`<a[^>]*href=["']https?://lermangas\\.me/manga/${escapeRegex(slug)}/([^"']+?)["'][^>]*>([\\s\\S]*?)<\\/a>`, "gi");
  let m;
  while ((m = regex.exec(html)) !== null) {
    const path = m[1];
    const inner = m[2].replace(/<[^>]+>/g, "").trim();
    const numMatch = path.match(/capitulo-([0-9.]+)/);
    if (!numMatch) continue;
    const num = parseFloat(numMatch[1]);
    if (isNaN(num)) continue;
    const title = inner.length > 1 && inner.length < 200 ? inner : null;
    chapters.push({ num, slug: path.replace(/\/+$/, ""), title });
  }
  
  // Dedup e ordena
  const seen = new Set<number>();
  return chapters.filter(c => { if (seen.has(c.num)) return false; seen.add(c.num); return true; }).sort((a, b) => a.num - b.num);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPageUrls(html: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const regex = /<img[^>]*class=["']wp-manga-chapter-img["'][^>]*src=["']([^"']+)["']/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = m[1].trim();
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  return urls;
}

async function main() {
  console.log(`[${ts()}] Raspando catalogo (${MAX_PAGES} paginas)...`);
  
  const allSlugs = new Set<string>();
  
  for (let p = 1; p <= MAX_PAGES; p++) {
    const url = p === 1 ? `${BASE}/manga/` : `${BASE}/manga/page/${p}/`;
    try {
      const html = await fetchHtml(url);
      const slugs = extractSlugs(html);
      slugs.forEach(s => allSlugs.add(s));
      if ((p) % 10 === 0 || p === 1) console.log(`[${ts()}] Pag ${p}: ${allSlugs.size} slugs unicos`);
    } catch {
      console.log(`[${ts()}] Pag ${p}: fim do catalogo`);
      break;
    }
  }

  const slugsArray = Array.from(allSlugs);
  console.log(`[${ts()}] Total catalogados: ${slugsArray.length}`);

  // Filtra ja existentes
  const existing = new Set((db.prepare("SELECT source_id FROM mangas WHERE source=?").all(SOURCE) as any[]).map(r => r.source_id));
  const pending = slugsArray.filter(s => !existing.has(s));
  console.log(`[${ts()}] Ja no DB: ${existing.size} | Pendentes: ${pending.length}`);

  if (pending.length === 0) { console.log("Nada a fazer."); return; }

  let totalMangas = 0, totalChapters = 0, totalPages = 0, totalErrors = 0;
  const t0 = Date.now();

  for (let i = 0; i < pending.length; i++) {
    const slug = pending[i];
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`\n[${ts()}] [${i+1}/${pending.length}] (+${elapsed}s) ${slug}`);

    try {
      const html = await fetchHtml(`${BASE}/manga/${slug}/`);
      const title = extractTitle(html);
      if (!title) { console.log("  sem titulo"); totalErrors++; continue; }

      const cover = extractCover(html);
      const synopsis = extractSynopsis(html);
      const author = extractAuthor(html);
      const chapters = extractChapters(html, slug).filter(c => c.num >= START_FROM).slice(0, MAX_CHAPTERS);

      const id = randomUUID();
      db.prepare(`INSERT OR IGNORE INTO mangas (id,slug,title,alternative_titles,synopsis,cover_url,author,status,source,source_id,source_url,last_synced_at,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'),datetime('now'))`)
        .run(id, slug, title.slice(0, 250), "[]", synopsis, cover, author, "ongoing", SOURCE, slug, `${BASE}/manga/${slug}/`);
      
      totalMangas++;
      let chAdded = 0, pgAdded = 0;

      for (const ch of chapters) {
        const exist = db.prepare("SELECT id FROM manga_chapters WHERE manga_id=? AND chapter_number=?").get(id, ch.num) as any;
        if (exist) continue;

        const chId = randomUUID();
        db.prepare(`INSERT INTO manga_chapters (id,manga_id,chapter_number,title,slug,source_url,page_count) VALUES (?,?,?,?,?,?,0)`)
          .run(chId, id, ch.num, ch.title || `Cap ${ch.num}`, ch.slug, `${BASE}/manga/${slug}/${ch.slug}/`);
        chAdded++;

        try {
          const chHtml = await fetchHtml(`${BASE}/manga/${slug}/${ch.slug}/`);
          const pages = extractPageUrls(chHtml);
          if (pages.length === 0) { 
            // Tenta com parse alternativo
            const altPages = [...chHtml.matchAll(/src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/g)].map(m => m[1]).filter(u => u.includes("wp-content"));
            const uniqueAlt = [...new Set(altPages)];
            for (let pi = 0; pi < Math.min(uniqueAlt.length, 80); pi++) {
              db.prepare("INSERT OR IGNORE INTO manga_pages (id,chapter_id,page_number,image_url) VALUES (?,?,?,?)").run(randomUUID(), chId, pi+1, uniqueAlt[pi]);
            }
            pgAdded += Math.min(uniqueAlt.length, 80);
          } else {
            for (let pi = 0; pi < pages.length; pi++) {
              db.prepare("INSERT OR IGNORE INTO manga_pages (id,chapter_id,page_number,image_url) VALUES (?,?,?,?)").run(randomUUID(), chId, pi+1, pages[pi]);
            }
            pgAdded += pages.length;
          }
          db.prepare("UPDATE manga_chapters SET page_count=? WHERE id=?").run(pgAdded - (chAdded > 1 ? 0 : 0), chId);
        } catch(e) {
          // skip chapter page error
        }
        
        await sleep(150); // pausa educada
      }

      totalChapters += chAdded;
      totalPages += pgAdded;
      console.log(`  OK: ${title.slice(0, 50)} | +${chAdded} caps +${pgAdded} pags`);

      if ((i + 1) % 5 === 0) {
        const rate = (totalChapters + totalPages) / ((Date.now() - t0) / 1000);
        console.log(`\n[CHECK ${i+1}/${pending.length}] +${totalMangas} mangas +${totalChapters} caps +${totalPages} pags ${rate.toFixed(1)}/s\n`);
      }
    } catch (e: any) {
      console.log(`  ERRO: ${e.message.slice(0, 80)}`);
      totalErrors++;
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const finalMangas = (db.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c;
  const finalCaps = (db.prepare("SELECT COUNT(*) c FROM manga_chapters").get() as any).c;
  const finalPags = (db.prepare("SELECT COUNT(*) c FROM manga_pages").get() as any).c;

  console.log(`\n${"=".repeat(55)}`);
  console.log("RESUMO FINAL — LERMANGAS.ME");
  console.log("=".repeat(55));
  console.log(`  Mangas processados: ${totalMangas}`);
  console.log(`  Capitulos adicionados: ${totalChapters}`);
  console.log(`  Paginas adicionadas: ${totalPages}`);
  console.log(`  Erros: ${totalErrors}`);
  console.log(`  Tempo: ${elapsed}s`);
  console.log(``);
  console.log(`  TOTAL NO BANCO AGORA:`);
  console.log(`  Mangas: ${finalMangas}`);
  console.log(`  Capitulos: ${finalCaps}`);
  console.log(`  Paginas: ${finalPags}`);
  console.log("=".repeat(55));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
