/**
 * Busca capas reais por mangá:
 * 1. Tenta fontes conhecidas: mangaonline, anilist, mangadex (já populado)
 * 2. Tenta Google Imagens via scraping
 * 3. Fallback: SVG gerado
 *
 * Roda em loop, processa 1 mangá por vez, dá feedback.
 */

import { chromium } from "playwright";
import Database = require("better-sqlite3");
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const db = new Database("data/tomoverso.db");
const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// Identifica capas placeholder (logo do lermangas ou baixadas)
async function isPlaceholder(path: string): Promise<boolean> {
  const fs = await import("fs/promises");
  try {
    const buf = await fs.readFile(path);
    // Tenta decodificar SVG pra ver se tem referencia a "lermangas"
    const txt = buf.toString("utf8").slice(0, 2000);
    if (txt.includes("lermangas-logo") || txt.includes("Lermangas")) return true;
  } catch {}
  return false;
}

// Fontes de onde buscar (apenas sites que não bloqueiam scrape simples)
const SEARCH_SOURCES = [
  {
    name: "google",
    buildUrl: (title: string) =>
      `https://www.google.com/search?q=${encodeURIComponent(title + " manga cover")}&tbm=isch`,
    extract: async (page: any) => {
      // Google Imagens: pegar primeiro result
      return await page.evaluate(() => {
        const img = document.querySelector("img[data-src], img.rg_i, img.Q4LuWd");
        if (!img) return null;
        const src = (img as HTMLImageElement).src || (img as HTMLImageElement).getAttribute("data-src");
        return src || null;
      });
    },
  },
  {
    name: "duckduckgo",
    buildUrl: (title: string) =>
      `https://duckduckgo.com/?q=${encodeURIComponent(title + " manga cover")}&iax=images&ia=images`,
    extract: async (page: any) => {
      return await page.evaluate(() => {
        // DDG Images: tile--img class
        const img = document.querySelector("img.tile--img__img") as HTMLImageElement;
        return img?.src || null;
      });
    },
  },
  {
    name: "bing",
    buildUrl: (title: string) =>
      `https://www.bing.com/images/search?q=${encodeURIComponent(title + " manga cover")}`,
    extract: async (page: any) => {
      return await page.evaluate(() => {
        const img = document.querySelector("a.iusc")?.getAttribute("href") || null;
        return img;
      });
    },
  },
];

async function downloadImage(url: string, slug: string): Promise<string | null> {
  if (!url || url.startsWith("data:")) return null;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    let ext = "jpg";
    if (ct.includes("png")) ext = "png";
    else if (ct.includes("webp")) ext = "webp";
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) return null;
    const filename = `${slug}.${ext}`;
    const localPath = join(outDir, filename);
    const publicPath = `/uploads/mangas/locais/${filename}`;
    writeFileSync(localPath, buf);
    return publicPath;
  } catch {
    return null;
  }
}

async function findCover(browser: any, title: string, slug: string): Promise<string | null> {
  for (const source of SEARCH_SOURCES) {
    const page = await browser.newPage();
    try {
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
      const url = source.buildUrl(title);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(3500);
      const foundUrl = await source.extract(page);
      if (foundUrl && foundUrl.startsWith("http")) {
        const localPath = await downloadImage(foundUrl, slug);
        if (localPath) {
          await page.close();
          return localPath;
        }
      }
    } catch (e) {
      // tenta próximo
    }
    await page.close();
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const startIdx = parseInt(args.find(a => a.startsWith("--start="))?.split("=")[1] || "0", 10);
  const maxArg = args.find(a => a.startsWith("--max="))?.split("=")[1];
  const max = maxArg ? parseInt(maxArg, 10) : 999999;

  // Primeiro pega todos que tem SVG (capas placeholder) OU url externa
  const candidates = db.prepare(`
    SELECT m.id, m.slug, m.title,
           (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
    FROM mangas m
    WHERE m.cover_local_path LIKE '%.svg' OR m.cover_local_path IS NULL
    ORDER BY chapter_count DESC
    LIMIT ? OFFSET ?
  `).all(max, startIdx) as any[];

  console.log(`Mangas para buscar capa: ${candidates.length}`);
  if (candidates.length === 0) return;

  const browser = await chromium.launch({ headless: true });
  let found = 0, svg = 0, failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const m = candidates[i];
    console.log(`\n[${i+1}/${candidates.length}] ${m.title} (${m.slug})`);

    // Tenta fontes externas
    const result = await findCover(browser, m.title, m.slug);
    if (result) {
      db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(result, m.id);
      console.log(`  ✅ Capa real baixada: ${result.split('/').pop()}`);
      found++;
    } else {
      // Fallback: usa título legível pra capa SVG melhor
      console.log(`  ⚠ Sem imagem real, mantém SVG existente`);
      failed++;
    }

    if ((i + 1) % 5 === 0) {
      const total = (db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.jpg' OR cover_local_path LIKE '%.png' OR cover_local_path LIKE '%.webp'").get() as any).c;
      const svgTotal = (db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.svg'").get() as any).c;
      console.log(`\n[CHECK] reais=${total} | svg=${svgTotal} | ultimo OK=${found}/${i+1}`);
    }
  }

  await browser.close();
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Real: ${found} | SVG mantido: ${failed}`);
  console.log("=".repeat(50));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });