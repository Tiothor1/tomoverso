/**
 * Vai no Google Imagens pra cada mangá, pega a primeira imagem grande
 * (geralmente a capa oficial sem marca), baixa e salva em /public/uploads/mangas/locais/.
 *
 * Uso: npx tsx scripts/google-covers-fetch.ts [--start=N] [--max=N]
 */

import { chromium } from "playwright";
import Database = require("better-sqlite3");
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const db = new Database("data/tomoverso.db");
const outDir = join(process.cwd(), "public", "uploads", "mangas", "locais");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function cleanTitle(t: string): string {
  return t
    .replace(/\s*-\s*pt\s*br\s*$/i, "")
    .replace(/\s*-\s*manga\s*$/i, "")
    .replace(/\s*\(\s*pt-br\s*\)\s*$/i, "")
    .replace(/\s*manga\s*$/i, "")
    .replace(/\s*manhwa\s*$/i, "")
    .replace(/\s*manhua\s*$/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

// Heuristica: palavras que indicam capa OFICIAL (sem marca)
function isLikelyCover(url: string, alt: string): boolean {
  const url_l = url.toLowerCase();
  const alt_l = (alt || "").toLowerCase();
  // Recusa logos / watermarks
  if (url_l.includes("logo") || alt_l.includes("logo")) return false;
  if (url_l.includes("watermark")) return false;
  if (url_l.includes("icon")) return false;
  return true;
}

async function searchGoogleImages(page: any, title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${title} manga cover`);
    const url = `https://www.google.com/search?q=${q}&tbm=isch&hl=pt-BR`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);

    // Clica no primeiro resultado pra abrir versão grande
    const firstImg = await page.evaluate(() => {
      const imgs = document.querySelectorAll("img");
      const candidates = Array.from(imgs)
        .filter((img: HTMLImageElement) => img.naturalWidth >= 200 && img.naturalHeight >= 250)
        .map((img: HTMLImageElement) => ({
          src: img.src,
          alt: img.alt,
          w: img.naturalWidth,
          h: img.naturalHeight,
        }));
      // Pega maior
      candidates.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      return candidates[0] || null;
    });

    if (!firstImg) return null;
    if (!isLikelyCover(firstImg.src, firstImg.alt)) {
      // tenta próxima
      const second = await page.evaluate(() => {
        const imgs = document.querySelectorAll("img");
        const candidates = Array.from(imgs)
          .filter((img: HTMLImageElement) => img.naturalWidth >= 200 && img.naturalHeight >= 250)
          .slice(1, 5)
          .map((img: HTMLImageElement) => ({ src: img.src, alt: img.alt }));
        return candidates[0] || null;
      });
      return second?.src || null;
    }
    return firstImg.src;
  } catch (e) {
    return null;
  }
}

async function searchDuckDuckGo(page: any, title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${title} manga cover art`);
    await page.goto(`https://duckduckgo.com/?q=${q}&iax=images&ia=images`, {
      waitUntil: "domcontentloaded", timeout: 20000,
    });
    await page.waitForTimeout(3000);

    const img = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("img"))
        .filter((img: HTMLImageElement) => img.naturalWidth >= 250 && img.naturalHeight >= 300)
        .map((img: HTMLImageElement) => ({
          src: img.src,
          alt: img.alt,
          w: img.naturalWidth,
          h: img.naturalHeight,
        }));
      candidates.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      return candidates[0] || null;
    });
    return img?.src || null;
  } catch {
    return null;
  }
}

async function searchBing(page: any, title: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${title} manga cover`);
    await page.goto(`https://www.bing.com/images/search?q=${q}`, {
      waitUntil: "domcontentloaded", timeout: 20000,
    });
    await page.waitForTimeout(3000);

    const img = await page.evaluate(() => {
      // Bing usa link com murl que tem a imagem full
      const a = document.querySelector("a.iusc") as HTMLAnchorElement | null;
      if (a) {
        try {
          const data = JSON.parse(a.getAttribute("m") || "{}");
          if (data.murl) return data.murl;
        } catch {}
      }
      // fallback
      const imgs = Array.from(document.querySelectorAll("img"))
        .filter((img: HTMLImageElement) => img.naturalWidth >= 250)
        .map((img: HTMLImageElement) => img.src);
      return imgs[0] || null;
    });
    return img || null;
  } catch {
    return null;
  }
}

async function download(url: string, slug: string): Promise<string | null> {
  if (!url || url.startsWith("data:")) return null;
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("image")) return null;
    let ext = "jpg";
    if (ct.includes("png")) ext = "png";
    else if (ct.includes("webp")) ext = "webp";
    else if (ct.includes("jpeg")) ext = "jpg";
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 5000) return null; // muito pequeno provavelmente nao e capa
    const filename = `${slug}.${ext}`;
    const localPath = join(outDir, filename);
    const publicPath = `/uploads/mangas/locais/${filename}`;
    writeFileSync(localPath, buf);
    return publicPath;
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const max = parseInt(args.find(a => a.startsWith("--max="))?.split("=")[1] || "9999", 10);
  const start = parseInt(args.find(a => a.startsWith("--start="))?.split("=")[1] || "0", 10);

  // Foca em SVGs (placeholders) e capas externas nao baixadas
  const candidates = db.prepare(`
    SELECT m.id, m.slug, m.title,
           (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
    FROM mangas m
    WHERE m.cover_local_path LIKE '%.svg'
       OR m.cover_local_path IS NULL
    ORDER BY chapter_count DESC
    LIMIT ? OFFSET ?
  `).all(max, start) as any[];

  console.log(`Mangas para buscar capa no Google: ${candidates.length}`);
  if (candidates.length === 0) return;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  let found = 0, failed = 0;
  const t0 = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const m = candidates[i];
    const cleaned = cleanTitle(m.title);
    console.log(`[${i+1}/${candidates.length}] ${m.title} -> "${cleaned}"`);

    const page = await context.newPage();
    let url = await searchDuckDuckGo(page, cleaned);

    // Tenta com titulo original se limpa falhou
    if (!url) {
      url = await searchDuckDuckGo(page, m.title);
    }
    if (!url) {
      url = await searchBing(page, cleaned);
    }
    if (!url) {
      url = await searchGoogleImages(page, cleaned);
    }

    await page.close();

    if (url) {
      const localPath = await download(url, m.slug);
      if (localPath) {
        db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = NULL WHERE id = ?").run(localPath, m.id);
        console.log(`  ✅ ${localPath.split('/').pop()}`);
        found++;
      } else {
        console.log(`  ❌ URL valida mas download falhou`);
        failed++;
      }
    } else {
      console.log(`  ⚠ Sem resultado`);
      failed++;
    }

    if ((i + 1) % 10 === 0) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      const rate = ((i + 1) / ((Date.now() - t0) / 1000)).toFixed(2);
      const total = (db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.jpg' OR cover_local_path LIKE '%.png' OR cover_local_path LIKE '%.webp'").get() as any).c;
      const svg = (db.prepare("SELECT COUNT(*) c FROM mangas WHERE cover_local_path LIKE '%.svg'").get() as any).c;
      console.log(`\n[CHECK ${i+1} | ${elapsed}s | ${rate}/s] reais=${total} svg=${svg} OK=${found}\n`);
    }

    await sleep(800); // educado com Google
  }

  await browser.close();
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Capas reais: ${found} | Falhas: ${failed}`);
  console.log("=".repeat(50));
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });