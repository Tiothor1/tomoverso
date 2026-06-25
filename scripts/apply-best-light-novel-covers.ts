import Database = require("better-sqlite3");
import sharp = require("sharp");
import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";

const db = new Database("data/tomoverso.db");
const force = process.argv.includes("--force");
const root = process.cwd();
const cnDir = path.join(root, "public", "uploads", "novels", "centralnovel");
const origDir = path.join(root, "public", "uploads", "novels", "original");
mkdirSync(cnDir, { recursive: true });
mkdirSync(origDir, { recursive: true });

type NovelRow = {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  source: string | null;
  source_url: string | null;
  cover_local_path: string | null;
  cover_url: string | null;
};

function normalizeWpUrl(url: string) {
  return url
    .replace(/^https:\/\/i\d+\.wp\.com\//i, "https://")
    .replace(/\?resize=\d+,\d+$/i, "");
}

function pickCentralNovelCover(html: string): string | null {
  const imgs = Array.from(html.matchAll(/<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>/gi)).map((m) => m[1]);
  const candidates = imgs.filter(
    (u) => /wp-content\/uploads\//i.test(u) && /(capa|cover|central)/i.test(u) && !/logo|loading\.gif/i.test(u)
  );
  const scored = candidates
    .map((u, i) => {
      const m = u.match(/resize=(\d+),(\d+)/i);
      const w = m ? Number(m[1]) : 0;
      const h = m ? Number(m[2]) : 0;
      const score = (w >= 300 || h >= 400 ? 100000 : 0) + w * h - i;
      return { u, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.u ? normalizeWpUrl(scored[0].u) : null;
}

async function fetchText(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`GET ${url} => ${res.status}`);
  return await res.text();
}

async function fetchBuffer(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://centralnovel.com/" } });
  if (!res.ok) throw new Error(`IMG ${url} => ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function normalizeCover(buffer: Buffer) {
  const width = 600;
  const height = 900;
  const base = sharp(buffer).resize(width, height, { fit: "cover", position: "attention" }).blur(20);
  const fg = await sharp(buffer)
    .resize(width - 56, height - 56, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const shadow = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s"><feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000" flood-opacity="0.45"/></filter>
      </defs>
      <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="18" fill="rgba(0,0,0,.18)" filter="url(#s)"/>
      <rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="22" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2"/>
    </svg>`);
  return await base
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: fg, top: 28, left: 28 },
    ])
    .webp({ quality: 92 })
    .toBuffer();
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function wrapTitle(title: string, max = 14) {
  const words = title.replace(/[:：]/g, ": ").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= max) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5);
}

function makeOqedeSvg(title: string) {
  const lines = wrapTitle(title, 13);
  const titleText = lines
    .map((line, i) => `<tspan x="50" dy="${i === 0 ? 0 : 44}">${esc(line)}</tspan>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a1425"/>
        <stop offset="35%" stop-color="#2b304f"/>
        <stop offset="70%" stop-color="#20425a"/>
        <stop offset="100%" stop-color="#7d4a2d"/>
      </linearGradient>
      <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffcc7d"/>
        <stop offset="100%" stop-color="#d88831"/>
      </linearGradient>
      <linearGradient id="cool" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#a0efff"/>
        <stop offset="100%" stop-color="#5cc7ff"/>
      </linearGradient>
      <radialGradient id="portal" cx="55%" cy="34%" r="42%">
        <stop offset="0%" stop-color="#d6f8ff" stop-opacity="0.95"/>
        <stop offset="40%" stop-color="#7fdcff" stop-opacity="0.70"/>
        <stop offset="78%" stop-color="#4f8fb5" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="goldGlow" cx="18%" cy="18%" r="30%">
        <stop offset="0%" stop-color="#ffdb9e" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.45"/></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>

    <rect width="600" height="900" fill="url(#bg)"/>
    <rect width="600" height="900" fill="url(#goldGlow)"/>
    <circle cx="338" cy="286" r="188" fill="url(#portal)"/>
    <circle cx="338" cy="286" r="205" fill="none" stroke="#c8f6ff" stroke-opacity="0.28" stroke-width="8"/>
    <circle cx="338" cy="286" r="226" fill="none" stroke="#ffd28a" stroke-opacity="0.12" stroke-width="3"/>

    <!-- apartment / real side -->
    <rect x="0" y="0" width="248" height="470" fill="#261f30" opacity="0.45"/>
    <rect x="28" y="78" width="128" height="196" rx="10" fill="#1e2636" stroke="#ffd59a" stroke-opacity="0.25"/>
    <line x1="92" y1="78" x2="92" y2="274" stroke="#ffd59a" stroke-opacity="0.18" stroke-width="3"/>
    <line x1="28" y1="178" x2="156" y2="178" stroke="#ffd59a" stroke-opacity="0.18" stroke-width="3"/>
    <path d="M0 622 C80 562 154 570 214 600 C262 624 310 632 360 618 L360 900 L0 900 Z" fill="#8a5939" opacity="0.62"/>
    <rect x="62" y="560" width="182" height="124" rx="10" fill="#d9c7a7" transform="rotate(-10 62 560)" filter="url(#shadow)"/>
    <line x1="92" y1="602" x2="226" y2="578" stroke="#7a5f48" stroke-width="5" opacity="0.42"/>
    <line x1="84" y1="632" x2="218" y2="608" stroke="#7a5f48" stroke-width="5" opacity="0.34"/>
    <line x1="78" y1="662" x2="212" y2="638" stroke="#7a5f48" stroke-width="5" opacity="0.28"/>
    <path d="M236 556 L286 526" stroke="#f1d5a1" stroke-width="10" stroke-linecap="round"/>

    <!-- fantasy side -->
    <path d="M330 610 L330 470 L378 418 L378 610 Z" fill="#18263a"/>
    <path d="M418 610 L418 390 L470 334 L470 610 Z" fill="#1c3150"/>
    <path d="M378 418 L418 374 L470 334 L420 310 L378 354 Z" fill="#24466c"/>
    <path d="M332 470 L378 418 L418 390 L374 364 L332 414 Z" fill="#2a527e"/>
    <rect x="362" y="510" width="20" height="100" fill="#91e6ff" opacity="0.45"/>
    <rect x="442" y="452" width="20" height="158" fill="#91e6ff" opacity="0.42"/>
    <path d="M430 160 C472 120 526 118 556 152 C524 154 502 176 490 204 C468 188 450 178 430 180 Z" fill="none" stroke="#ffd082" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>

    <!-- mirror crack -->
    <path d="M286 70 L318 858" stroke="#d7fbff" stroke-opacity="0.82" stroke-width="7" stroke-linecap="round"/>
    <path d="M292 154 L262 206 M305 280 L350 332 M300 452 L258 506 M312 602 L352 648 M294 726 L260 776" stroke="#d7fbff" stroke-opacity="0.58" stroke-width="3"/>

    <!-- Arlén apparition inside portal -->
    <ellipse cx="392" cy="298" rx="84" ry="118" fill="#1d2740" opacity="0.42" filter="url(#soft)"/>
    <circle cx="396" cy="248" r="34" fill="#f2d9bd" opacity="0.82"/>
    <path d="M360 238 C372 194 426 190 438 234 C430 214 414 206 396 206 C378 206 366 214 360 238 Z" fill="#d9c07d" opacity="0.88"/>
    <path d="M364 286 C378 302 416 304 430 286 L438 370 C408 392 384 392 354 370 Z" fill="#223250" opacity="0.88"/>
    <path d="M344 370 C366 340 430 340 448 374 C426 410 406 454 394 506 C384 454 366 414 344 370 Z" fill="#2a4d73" opacity="0.92"/>
    <path d="M390 236 L398 236" stroke="#6e4f39" stroke-width="2" stroke-linecap="round" opacity="0.6"/>

    <!-- Yumi foreground -->
    <circle cx="238" cy="366" r="38" fill="#f3d1b8" opacity="0.96"/>
    <path d="M204 360 C210 308 266 302 282 354 C274 326 252 312 232 314 C218 316 210 328 204 360 Z" fill="#3b1f1e"/>
    <path d="M196 414 C210 448 218 506 210 620 L332 620 C320 510 314 446 282 404 C266 420 252 428 238 428 C224 428 210 422 196 414 Z" fill="#f2ede6"/>
    <path d="M184 430 C148 456 124 494 112 548" stroke="#f2ede6" stroke-width="24" stroke-linecap="round"/>
    <path d="M290 430 C326 454 350 492 366 554" stroke="#f2ede6" stroke-width="24" stroke-linecap="round"/>
    <rect x="250" y="504" width="72" height="94" rx="6" fill="#b79361" transform="rotate(-10 250 504)" filter="url(#shadow)"/>
    <rect x="256" y="510" width="60" height="82" rx="4" fill="#e8d8ba" transform="rotate(-10 256 510)"/>

    <!-- drawn lines becoming real -->
    <path d="M286 540 C332 512 382 494 430 498 C406 510 390 526 376 548 C344 548 316 550 288 564" fill="none" stroke="url(#warm)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M324 470 C362 448 408 440 456 454" fill="none" stroke="url(#cool)" stroke-width="4" stroke-linecap="round" opacity="0.72"/>
    <path d="M330 520 C364 488 404 474 448 478 C430 492 416 512 406 534" fill="none" stroke="url(#warm)" stroke-width="5" stroke-linecap="round"/>

    <!-- floating pages/particles -->
    <rect x="170" y="160" width="26" height="34" rx="2" fill="#efe3ca" transform="rotate(-18 170 160)" opacity="0.86"/>
    <rect x="454" y="108" width="22" height="30" rx="2" fill="#efe3ca" transform="rotate(14 454 108)" opacity="0.78"/>
    <rect x="488" y="254" width="18" height="24" rx="2" fill="#efe3ca" transform="rotate(18 488 254)" opacity="0.72"/>
    <circle cx="122" cy="118" r="2" fill="#ffd99d"/><circle cx="158" cy="138" r="1.5" fill="#ffd99d"/>
    <circle cx="462" cy="200" r="2" fill="#c4f2ff"/><circle cx="506" cy="224" r="1.5" fill="#c4f2ff"/>

    <rect x="34" y="34" width="532" height="832" rx="30" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
    <rect x="0" y="644" width="600" height="256" fill="#0d1020" opacity="0.72"/>
    <text x="50" y="694" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" letter-spacing="4" fill="#f5d29b">LIGHT NOVEL · FANTASIA · DRAMA</text>
    <text x="50" y="744" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="800" fill="#ffffff" filter="url(#shadow)">${titleText}</text>
    <text x="50" y="850" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" fill="#c9efff">mundo espelho · criadora da história · romance lento</text>
  </svg>`;
}

async function applyCentralNovel() {
  const rows = db.prepare(`SELECT id, slug, title, synopsis, source, source_url, cover_local_path, cover_url FROM novels WHERE type='light-novel' AND source='centralnovel' ORDER BY title`).all() as NovelRow[];
  const results: any[] = [];
  for (const row of rows) {
    const publicPath = `/uploads/novels/centralnovel/${row.slug}-cover.webp`;
    if (!force && row.cover_local_path === publicPath) {
      results.push({ slug: row.slug, status: 'skipped-already-local' });
      continue;
    }
    if (!row.source_url) throw new Error(`Sem source_url: ${row.slug}`);
    const html = await fetchText(row.source_url);
    const coverUrl = pickCentralNovelCover(html);
    if (!coverUrl) throw new Error(`Sem cover no HTML: ${row.slug}`);
    const raw = await fetchBuffer(coverUrl);
    const final = await normalizeCover(raw);
    const fileName = `${row.slug}-cover.webp`;
    writeFileSync(path.join(cnDir, fileName), final);
    db.prepare(`UPDATE novels SET cover_local_path=?, cover_url=?, cover_source_url=?, updated_at=datetime('now') WHERE id=?`).run(publicPath, publicPath, coverUrl, row.id);
    results.push({ slug: row.slug, status: 'updated', coverUrl, publicPath });
    console.log(`updated ${row.slug}`);
  }
  return results;
}

async function applyOriginal() {
  const row = db.prepare(`SELECT id, slug, title, synopsis, source, source_url, cover_local_path, cover_url FROM novels WHERE slug='o-que-eu-desenhei-existe'`).get() as NovelRow | undefined;
  if (!row) return null;
  const svg = makeOqedeSvg(row.title);
  const out = await sharp(Buffer.from(svg)).webp({ quality: 96 }).toBuffer();
  const publicPath = `/uploads/novels/original/${row.slug}-cover.webp`;
  writeFileSync(path.join(origDir, `${row.slug}-cover.webp`), out);
  db.prepare(`UPDATE novels SET cover_local_path=?, cover_url=?, cover_source_url=?, updated_at=datetime('now') WHERE id=?`).run(publicPath, publicPath, 'generated:custom-svg', row.id);
  console.log(`updated ${row.slug}`);
  return { slug: row.slug, status: 'updated-custom', publicPath };
}

(async () => {
  const central = await applyCentralNovel();
  const original = await applyOriginal();
  const summary = db.prepare(`SELECT COUNT(*) c FROM novels WHERE type='light-novel' AND cover_local_path IS NOT NULL AND trim(cover_local_path)!=''`).get() as { c: number };
  console.log(JSON.stringify({ centralUpdated: central.filter((x) => x.status === 'updated').length, centralTotal: central.length, original, totalLightNovelsWithLocalCover: summary.c }, null, 2));
})();
