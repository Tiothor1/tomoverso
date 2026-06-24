/**
 * Importa mangás do batoto.website.
 * Usa Playwright por ser SPA, com fallback a regex no HTML.
 * 
 * Uso: npx tsx scripts/import-batoto.ts --pages=20
 *      npx tsx scripts/import-batoto.ts --pages=20 --import
 */

import { chromium } from "playwright";
import Database = require("better-sqlite3");
import { randomUUID } from "crypto";

const argv = process.argv.slice(2);
const MAX_PAGES = parseInt(argv.find(a=>a.startsWith("--pages="))?.split("=")[1]||"10", 10);
const DO_IMPORT = argv.includes("--import");
const BASE = "https://batoto.website";

async function getHtml(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 25000 });
  await page.waitForTimeout(3000);
  const html = await page.content();
  await browser.close();
  return html;
}

function extractSlugsFromHtml(html: string): Array<{slug:string;title:string}> {
  const results: Array<{slug:string;title:string}> = [];
  const seen = new Set<string>();
  
  // Match links like <a href="https://batoto.website/manga/slug/">Title</a>
  const regex = /<a[^>]*href="(?:https?:\/\/batoto\.website)?\/manga\/([^"/]+)\/?"[^>]*>([^<]{3,150})<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const slug = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    if (seen.has(slug) || slug.includes("page") || slug.includes("search") || slug.includes("wp-") || slug.includes("feed")) continue;
    seen.add(slug);
    results.push({ slug, title });
  }
  
  return results;
}

async function main() {
  const db = new Database("data/tomoverso.db");
  const existing = new Set((db.prepare("SELECT source_id FROM mangas WHERE source='batoto.website'").all() as any[]).map(r => r.source_id));
  
  console.log(`Ja no DB: ${existing.size}`);
  const allSlugs: Array<{slug:string;title:string}> = [];
  const seen = new Set<string>();

  for (let p = 1; p <= MAX_PAGES; p++) {
    const url = `${BASE}/manga/page/${p}/`;
    console.log(`Pag ${p}: ${url}`);
    
    try {
      const html = await getHtml(url);
      const slugs = extractSlugsFromHtml(html).filter(s => {
        if (seen.has(s.slug)) return false;
        seen.add(s.slug);
        return true;
      });
      allSlugs.push(...slugs);
      console.log(`  → +${slugs.length} (total: ${allSlugs.length})`);
    } catch (e: any) {
      console.log(`  ERRO: ${e.message.slice(0,80)}`);
      break;
    }
  }

  if (allSlugs.length === 0) {
    console.log("Nada encontrado.");
    process.exit(0);
  }

  const pending = allSlugs.filter(m => !existing.has(m.slug));
  console.log(`\nTotal catalogados: ${allSlugs.length}`);
  console.log(`Pendentes: ${pending.length}`);

  if (!DO_IMPORT) {
    console.log("\nAmostra:");
    pending.slice(0, 15).forEach(m => console.log(`  ${m.slug}: ${m.title.slice(0,60)}`));
    console.log(`\nUse --import para importar de fato.`);
    process.exit(0);
  }

  // Importa os pendentes
  const browser = await chromium.launch({ headless: true });
  let ok = 0, fail = 0;
  const t0 = Date.now();

  for (let i = 0; i < pending.length; i++) {
    const m = pending[i];
    const slug = m.slug;
    console.log(`\n[${i+1}/${pending.length}] ${slug} (${m.title.slice(0,40)})`);

    let page;
    try {
      page = await browser.newPage();
      await page.goto(`${BASE}/manga/${slug}/`, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(3000);

      const data = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const title = h1?.textContent?.trim() || "";
        const coverEl = document.querySelector<HTMLImageElement>(".summary_image img, .thumb img, .img-responsive");
        const cover = coverEl?.src || "";
        const synopsisEl = document.querySelector(".summary__content p, .description p, .manga-summary p");
        const synopsis = synopsisEl?.textContent?.trim() || "";
        
        const authorEl = document.querySelector(".author-content a, .artist-content a, .mg_author a");
        const author = authorEl?.textContent?.trim() || null;
        
        const genreEls = document.querySelectorAll(".genres-content a, .mg_genre a, .manga-genre a");
        const genres = [...genreEls].map(a => a.textContent?.trim()).filter(Boolean);
        
        const chapterEls = document.querySelectorAll(".wp-manga-chapter a[href*='/manga/'], .chapters a[href*='/manga/']");
        const chapterCount = chapterEls.length;
        
        return { title, cover, synopsis, author, genres, chapterCount };
      });

      if (!data.title) {
        console.log(`  sem titulo`);
        fail++;
        await page.close();
        continue;
      }

      const id = randomUUID();
      db.prepare(`INSERT OR IGNORE INTO mangas (id,slug,title,alternative_titles,synopsis,cover_url,author,status,source,source_id,source_url,last_synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
        .run(id, slug, data.title.slice(0, 250), "[]", data.synopsis.slice(0, 3000), data.cover, data.author, "ongoing", "batoto.website", slug, `${BASE}/manga/${slug}/`);

      ok++;
      console.log(`  OK: ${data.title.slice(0,50)} | ${data.chapterCount} caps | ${data.genres.slice(0,3).join(",")}`);
      await page.close();
    } catch (e: any) {
      console.log(`  ERRO: ${e.message.slice(0,80)}`);
      if (page) await page.close();
      fail++;
    }
  }

  await browser.close();

  const elapsed = ((Date.now()-t0)/1000).toFixed(1);
  const total = (db.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Importados: ${ok} | Falhas: ${fail} | Tempo: ${elapsed}s`);
  console.log(`Total mangas no site: ${total}`);
  console.log("=".repeat(50));
}

main().catch(e=>{console.error("FATAL:",e);process.exit(1);});
