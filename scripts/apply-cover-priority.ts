import Database = require("better-sqlite3");
import sharp = require("sharp");
import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import * as path from "path";

type Manga = {
  id: string;
  slug: string;
  title: string;
  source_url: string | null;
  cover_local_path: string | null;
  cover_url: string | null;
};

type CoverSource = {
  kind: "proper" | "scene";
  input: Buffer | string;
  sourceUrl: string | null;
  note: string;
};

const db = new Database("data/tomoverso.db");
const properDir = path.join("public", "uploads", "mangas", "proper-covers");
const sceneDir = path.join("public", "uploads", "mangas", "scene-covers");
const locaisDir = path.join("public", "uploads", "mangas", "locais");
mkdirSync(properDir, { recursive: true });

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const cleanup = args.has("--cleanup");

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

function localRasterPath(slug: string): string | null {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const p = path.join(locaisDir, `${slug}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

function stripSize(url: string): string {
  return url.replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))(\?.*)?$/i, "$1$2");
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function fetchWithTimeout(url: string, timeoutMs = 9000): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Accept": "text/html,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": "https://mangaonline.blue/",
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url, 9000);
  if (!res || !res.ok) return null;
  return await res.text();
}

async function fetchImage(url: string): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  const res = await fetchWithTimeout(decodeHtml(url), 10000);
  if (!res || !res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct && !/image\//i.test(ct)) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 5_000) return null;
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    return { buffer, width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

function extractCoverCandidates(html: string): string[] {
  const candidates: string[] = [];

  // Prioridade: imagem do bloco de capa/sumário do Madara.
  const summaryMatch = html.match(/<div[^>]+class=["'][^"']*(?:summary_image|summary__image|post-content_item)[^"']*["'][\s\S]{0,2500}?<img[\s\S]+?>/i);
  if (summaryMatch) {
    const block = summaryMatch[0];
    const srcs = Array.from(block.matchAll(/(?:src|data-src)=["']([^"']+)["']/gi)).map((m) => decodeHtml(m[1]));
    const srcsets = Array.from(block.matchAll(/srcset=["']([^"']+)["']/gi)).flatMap((m) => decodeHtml(m[1]).split(",").map((p) => p.trim().split(/\s+/)[0]));
    candidates.push(...srcs, ...srcsets);
  }

  // Qualquer imagem de capa típica no HTML, excluindo sidebar/popular/logos.
  const imgRe = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const tag = m[0];
    const url = decodeHtml(m[1]);
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
    if (/logo|favicon|cropped|avatar|discord|facebook|instagram|scanlator/i.test(url + tag)) continue;
    if (/75x106|32x32|180x180|192x192|270x270/i.test(url)) continue;
    if (/wp-content\/uploads/i.test(url)) candidates.push(url);
  }

  // OG como último recurso: às vezes é banner, por isso fica com score menor se for wide.
  const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i)
    || html.match(/content=["']([^"']+)["'][^>]+property=["']og:image/i);
  if (og?.[1]) candidates.push(decodeHtml(og[1]));

  const variants = candidates.flatMap((u) => [u, stripSize(u)]);
  return unique(variants).filter((u) => /^https?:\/\//.test(u) && /\.(jpe?g|png|webp)(\?|$)/i.test(u));
}

function coverScore(width: number, height: number, url: string): number {
  const ratio = width / height;
  const ratioPenalty = Math.abs(ratio - 2 / 3) * 240;
  const pixels = Math.min(1, (width * height) / (600 * 900)) * 80;
  const sizedBonus = /-193x278|-350x476|-214x300|-210x300/i.test(url) ? 25 : 0;
  const widePenalty = ratio > 1.05 ? 180 : 0;
  const tinyPenalty = width < 140 || height < 200 ? 140 : 0;
  return 200 + pixels + sizedBonus - ratioPenalty - widePenalty - tinyPenalty;
}

async function liveCover(manga: Manga): Promise<CoverSource | null> {
  if (!manga.source_url) return null;
  const html = await fetchText(manga.source_url);
  if (!html) return null;
  const candidates = extractCoverCandidates(html).slice(0, 28);
  let best: { score: number; url: string; buffer: Buffer; width: number; height: number } | null = null;
  for (const url of candidates) {
    const img = await fetchImage(url);
    if (!img) continue;
    const score = coverScore(img.width, img.height, url);
    if (!best || score > best.score) best = { score, url, ...img };
  }
  if (!best) return null;
  if (best.score < 50) return null;
  return { kind: "proper", input: best.buffer, sourceUrl: best.url, note: `live:${best.width}x${best.height}` };
}

async function localCover(manga: Manga): Promise<CoverSource | null> {
  const p = localRasterPath(manga.slug);
  if (!p) return null;
  try {
    const meta = await sharp(p).metadata();
    if (!meta.width || !meta.height) return null;
    return { kind: "proper", input: p, sourceUrl: manga.source_url, note: `git-local:${meta.width}x${meta.height}` };
  } catch {
    return null;
  }
}

async function sceneCover(manga: Manga): Promise<CoverSource | null> {
  const p = path.join(sceneDir, `${manga.slug}.webp`);
  if (!existsSync(p)) return null;
  return { kind: "scene", input: p, sourceUrl: manga.cover_url, note: "scene-fallback" };
}

async function writeFittedCover(src: CoverSource, slug: string): Promise<string> {
  const outRel = `/uploads/mangas/proper-covers/${slug}.webp`;
  const outAbs = path.join(properDir, `${slug}.webp`);
  const input = src.input;

  const bg = await sharp(input)
    .resize(600, 900, { fit: "cover", position: "attention" })
    .blur(18)
    .modulate({ brightness: 0.55, saturation: 0.85 })
    .webp({ quality: 82 })
    .toBuffer();

  const fg = await sharp(input)
    .resize(600, 900, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: false })
    .webp({ quality: 92 })
    .toBuffer();

  await sharp(bg)
    .composite([{ input: fg, gravity: "center" }])
    .webp({ quality: 88, effort: 4 })
    .toFile(outAbs);

  return outRel;
}

async function processManga(manga: Manga, idx: number, total: number) {
  const outAbs = path.join(properDir, `${manga.slug}.webp`);
  if (!force && manga.cover_local_path?.startsWith("/uploads/mangas/proper-covers/") && existsSync(outAbs)) {
    console.log(`[${idx}/${total}] SKIP ${manga.slug}`);
    return { kind: "proper", skipped: true };
  }

  // Ordem pedida: capa própria primeiro.
  // Preferir a capa vertical ao vivo do mangaonline; algumas capas antigas locais eram banners 1200x630.
  let source = await liveCover(manga);
  if (!source) source = await localCover(manga);
  if (!source) source = await sceneCover(manga);
  if (!source) {
    console.log(`[${idx}/${total}] FAIL ${manga.slug} | sem capa e sem cena`);
    return { kind: "fail" };
  }

  if (source.kind === "proper") {
    const outRel = await writeFittedCover(source, manga.slug);
    db.prepare("UPDATE mangas SET cover_local_path=?, cover_url=?, updated_at=datetime('now') WHERE id=?").run(outRel, source.sourceUrl, manga.id);
    console.log(`[${idx}/${total}] PROPER ${manga.slug} | ${source.note}`);
    return { kind: "proper" };
  }

  db.prepare("UPDATE mangas SET cover_local_path=?, cover_url=?, updated_at=datetime('now') WHERE id=?").run(`/uploads/mangas/scene-covers/${manga.slug}.webp`, source.sourceUrl, manga.id);
  console.log(`[${idx}/${total}] SCENE ${manga.slug} | fallback`);
  return { kind: "scene" };
}

async function main() {
  const mangas = db.prepare("SELECT id,slug,title,source_url,cover_url,cover_local_path FROM mangas WHERE source='mangaonline.blue' ORDER BY title").all() as Manga[];
  let proper = 0, scene = 0, fail = 0;
  for (let i = 0; i < mangas.length; i++) {
    const r = await processManga(mangas[i], i + 1, mangas.length);
    if (r.kind === "proper") proper++;
    else if (r.kind === "scene") scene++;
    else fail++;
  }

  if (cleanup) {
    // Remove raw restored covers; final site uses proper-covers or scene-covers.
    if (existsSync(locaisDir)) {
      for (const f of readdirSync(locaisDir)) rmSync(path.join(locaisDir, f), { force: true });
    }
    // Remove unreferenced scene covers only if no DB points to them.
    const refs = new Set((db.prepare("SELECT cover_local_path p FROM mangas WHERE cover_local_path IS NOT NULL").all() as any[]).map((r) => r.p));
    if (existsSync(sceneDir)) {
      for (const f of readdirSync(sceneDir)) {
        const rel = `/uploads/mangas/scene-covers/${f}`;
        if (!refs.has(rel)) rmSync(path.join(sceneDir, f), { force: true });
      }
    }
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) total,
      SUM(CASE WHEN cover_local_path LIKE '/uploads/mangas/proper-covers/%' THEN 1 ELSE 0 END) proper,
      SUM(CASE WHEN cover_local_path LIKE '/uploads/mangas/scene-covers/%' THEN 1 ELSE 0 END) scene,
      SUM(CASE WHEN source='lermangas.me' OR coalesce(source_url,'') LIKE '%lermangas.me%' THEN 1 ELSE 0 END) lermangas
    FROM mangas
    WHERE source='mangaonline.blue'
  `).get();
  console.log(JSON.stringify({ proper, scene, fail, stats }, null, 2));
}

main().finally(() => db.close());
