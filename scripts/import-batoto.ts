/**
 * Raspa catálogo do batoto.website via Playwright.
 * Batoto é SPA (React), então precisa de headless browser.
 *
 * Uso: npx tsx scripts/import-batoto.ts [--pages=10] [--import]
 */

import { chromium } from "playwright";
import { randomUUID } from "crypto";
import Database = require("better-sqlite3");
import { existsSync, writeFileSync, readFileSync } from "fs";

const argv = process.argv.slice(2);
const MAX_PAGES = parseInt(argv.find(a=>a.startsWith("--pages="))?.split("=")[1]||"5", 10);
const DO_IMPORT = argv.includes("--import");
const BASE = "https://batoto.website";
const CK = "data/batoto-ck.json";

async function scrapeCatalog(): Promise<Array<{slug:string;title:string}>> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results: Array<{slug:string;title:string}> = [];
  const seen = new Set<string>();

  for (let p = 1; p <= MAX_PAGES; p++) {
    const url = `${BASE}/manga/page/${p}/`;
    console.log(`Pagina ${p}: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("a[href*='/manga/']", { timeout: 10000 }).catch(() => {});
      
      const links = await page.$$eval("a[href*='/manga/']", (els) =>
        els.map(el => ({ href: (el as HTMLAnchorElement).href, title: (el.textContent || "").trim() }))
      );
      
      for (const l of links) {
        const match = l.href.match(/\/manga\/([^/]+)/);
        if (!match) continue;
        const slug = match[1];
        if (seen.has(slug) || slug.includes("page") || slug.includes("search")) continue;
        seen.add(slug);
        results.push({ slug, title: l.title || slug });
      }
      
      console.log(`  → ${results.length} encontrados`);
    } catch (e: any) {
      console.log(`  ERRO: ${e.message.slice(0,80)}`);
      break;
    }
  }

  await browser.close();
  return results;
}

async function scrapeDetail(slug: string, browser: any): Promise<any> {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}/manga/${slug}/`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
    
    const data = await page.evaluate(() => {
      const title = document.querySelector("h1")?.textContent || "";
      const cover = (document.querySelector<HTMLImageElement>(".summary_image img, .thumb img")?.src) || "";
      const synopsis = document.querySelector(".summary__content p, .description p")?.textContent || "";
      const author = document.querySelector(".author-content a, .artist-content a")?.textContent || "";
      const genres = [...document.querySelectorAll(".genres-content a")].map(a => a.textContent).filter(Boolean);
      
      const chapters = [...document.querySelectorAll(".wp-manga-chapter a[href*='/manga/']")].map(a => ({
        href: a.getAttribute("href") || "",
        title: a.textContent?.trim() || "",
      }));
      
      return { title, cover, synopsis, author, genres, chapterCount: chapters.length };
    });
    
    await page.close();
    return data;
  } catch (e) {
    await page.close();
    throw e;
  }
}

async function main() {
  const db = new Database("data/tomoverso.db");
  
  console.log(`Raspando catalogo batoto (${MAX_PAGES} paginas)...`);
  const catalog = await scrapeCatalog();
  console.log(`Total encontrados: ${catalog.length}`);

  if (catalog.length === 0) {
    console.log("Nada encontrado.");
    process.exit(0);
  }

  // Filtra ja existentes
  const existing = new Set((db.prepare("SELECT source_id FROM mangas WHERE source='batoto.website'").all() as any[]).map(r => r.source_id));
  const pending = catalog.filter(m => !existing.has(m.slug));
  console.log(`Ja importados: ${existing.size} | Pendentes: ${pending.length}`);

  if (!DO_IMPORT) {
    console.log("\nUse --import para importar de fato.");
    console.log(`Amostra dos ${catalog.length}:`);
    catalog.slice(0, 10).forEach(m => console.log(`  ${m.slug}: ${m.title.slice(0,60)}`));
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const toImport = pending.slice(0, 50);
  let ok = 0, fail = 0;
  const t0 = Date.now();

  for (let i = 0; i < toImport.length; i++) {
    const m = toImport[i];
    console.log(`\n[${i+1}/${toImport.length}] ${m.slug}...`);

    try {
      const detail = await scrapeDetail(m.slug, browser);
      if (!detail.title) { console.log("  sem dados"); fail++; continue; }

      const id = randomUUID();
      db.prepare(`INSERT OR IGNORE INTO mangas (id,slug,title,alternative_titles,synopsis,cover_url,author,status,source,source_id,source_url,last_synced_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
        .run(id, m.slug, detail.title, "[]", detail.synopsis.slice(0,3000), detail.cover, detail.author, "ongoing", "batoto.website", m.slug, `${BASE}/manga/${m.slug}/`);

      ok++;
      console.log(`  OK: ${detail.title.slice(0,50)} | ${detail.chapterCount} caps | ${detail.genres.slice(0,3).join(", ")}`);
    } catch (e: any) {
      console.log(`  ERRO: ${e.message.slice(0,80)}`);
      fail++;
    }
  }

  await browser.close();
  
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  const total = (db.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c;
  console.log(`\nImportados: ${ok} | Falhas: ${fail} | Tempo: ${elapsed}s | Total mangas: ${total}`);
}

main().catch(e=>{console.error(e);process.exit(1);});
