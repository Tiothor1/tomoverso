import Database = require("better-sqlite3");
import sharp = require("sharp");
import { existsSync, mkdirSync } from "fs";
import * as path from "path";

type Manga = { id: string; slug: string; title: string; cover_local_path: string | null };
type Chapter = { chapter_number: number; source_url: string };
type Candidate = { url: string; mangaSlug: string; chapter: number; index: number; total: number };

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const arg = (name: string, fallback = "") => {
  const p = `${name}=`;
  const v = args.find((a) => a.startsWith(p));
  return v ? v.slice(p.length) : fallback;
};

const force = flag("--force");
const max = Number(arg("--max", "0"));
const offset = Number(arg("--offset", "0"));
const perMangaLimit = Number(arg("--image-limit", "160"));
const dryRun = flag("--dry-run");
const explicitSlugs = args.filter((a) => !a.startsWith("--"));

const db = new Database("data/tomoverso.db");
const outDir = path.join("public", "uploads", "mangas", "scene-covers");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0", Referer: "https://mangaonline.blue/" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchImage(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(decodeHtml(url), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: "https://mangaonline.blue/",
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10_000) return null;
    try { await sharp(buf).metadata(); } catch { return null; }
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractChapterImages(html: string, mangaSlug: string, chapter: number): Candidate[] {
  const found: string[] = [];
  const imgRe = /<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const url = decodeHtml(m[1]);
    if (!/\/WP-manga\/data\//i.test(url)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
    if (/logo|cropped|avatar|favicon|discord|facebook|instagram|scanlator/i.test(url)) continue;
    found.push(url);
  }
  const rawRe = /https?:\/\/[^"'\s<>]+\/WP-manga\/data\/[^"'\s<>]+?\.(?:jpe?g|png|webp)/gi;
  while ((m = rawRe.exec(html))) {
    const url = decodeHtml(m[0]);
    if (!found.includes(url)) found.push(url);
  }

  // Remove página inicial/final quando há bastante página: normalmente é capa/scan/aviso/crédito.
  const total = found.length;
  const trimmed = found.filter((_, idx) => {
    if (total >= 10 && (idx < 2 || idx >= total - 1)) return false;
    if (total >= 5 && idx === 0) return false;
    return true;
  });
  return trimmed.map((url, i) => ({ url, mangaSlug, chapter, index: i, total: trimmed.length }));
}

function pickChapters(chapters: Chapter[]): Chapter[] {
  if (chapters.length <= 8) return chapters;
  const idxs = new Set<number>();
  const anchors = [0.04, 0.18, 0.38, 0.58, 0.78, 0.94];
  for (const a of anchors) idxs.add(Math.min(chapters.length - 1, Math.max(0, Math.floor(chapters.length * a))));
  // Também inclui capítulos mais recentes, mas não só eles.
  for (let i = 0; i < Math.min(2, chapters.length); i++) idxs.add(i);
  return Array.from(idxs).sort((a, b) => a - b).map((i) => chapters[i]).slice(0, 7);
}

function cropOptions(width: number, height: number) {
  const target = 2 / 3;
  let cropW = width;
  let cropH = Math.round(width / target);
  if (cropH > height) { cropH = height; cropW = Math.round(height * target); }
  cropW = Math.max(120, Math.min(cropW, width));
  cropH = Math.max(180, Math.min(cropH, height));
  const xs = width > cropW ? [0.16, 0.38, 0.5, 0.62, 0.84] : [0.5];
  const ys = height > cropH ? [0.08, 0.20, 0.34, 0.48, 0.62, 0.78] : [0.5];
  const seen = new Set<string>();
  const out: Array<{ left: number; top: number; width: number; height: number; yRatio: number }> = [];
  for (const xr of xs) for (const yr of ys) {
    const left = Math.max(0, Math.min(width - cropW, Math.round((width - cropW) * xr)));
    const top = Math.max(0, Math.min(height - cropH, Math.round((height - cropH) * yr)));
    const key = `${left}:${top}:${cropW}:${cropH}`;
    if (!seen.has(key)) { seen.add(key); out.push({ left, top, width: cropW, height: cropH, yRatio: height > cropH ? top / (height - cropH) : .5 }); }
  }
  return out;
}

async function scoreCrop(buffer: Buffer, crop: any): Promise<number> {
  const small = await sharp(buffer).extract(crop).resize(96, 144).removeAlpha().raw().toBuffer();
  const n = small.length / 3;
  let lum = 0, lum2 = 0, sat = 0, skin = 0, white = 0, black = 0, mid = 0, edge = 0;
  const lums = new Float32Array(n);
  for (let i = 0, p = 0; i < small.length; i += 3, p++) {
    const r = small[i], g = small[i + 1], b = small[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = 0.299*r + 0.587*g + 0.114*b;
    const s = max ? (max-min)/max : 0;
    lums[p] = l; lum += l; lum2 += l*l; sat += s;
    if (l > 238 && s < .12) white++;
    if (l < 20) black++;
    if (l > 45 && l < 220) mid++;
    if (r > 85 && g > 45 && b > 25 && r > g*1.04 && g > b*1.05 && r-b > 25) skin++;
  }
  for (let y = 1; y < 144; y++) for (let x = 1; x < 96; x++) {
    const idx = y * 96 + x;
    edge += Math.abs(lums[idx]-lums[idx-1]) + Math.abs(lums[idx]-lums[idx-96]);
  }
  edge /= (95*143*2);
  const mean = lum/n, std = Math.sqrt(Math.max(0, lum2/n - mean*mean));
  const satR = sat/n, skinR = skin/n, whiteR = white/n, blackR = black/n, midR = mid/n;
  const center = 1 - Math.abs(crop.yRatio - .42);
  const characterBonus = Math.min(1, skinR * 10) * 105;
  const noCharacterPenalty = skinR < .006 ? 72 : skinR < .018 ? 38 : 0;
  const splashTextPenalty = skinR < .012 && (satR > .16 || std > 62) ? 52 : 0;
  let score = std*.92 + edge*.50 + satR*22 + midR*20 + characterBonus + center*14;
  score += Math.max(0, 1 - Math.abs(mean-128)/128)*16;
  score -= Math.max(0, whiteR-.30)*180 + Math.max(0, blackR-.62)*80;
  score -= noCharacterPenalty + splashTextPenalty;
  if (whiteR > .64 || blackR > .84) score -= 160;
  if (std < 18 && satR < .08) score -= 120;
  return score;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  async function worker() { while (cursor < items.length) { const i = cursor++; out[i] = await fn(items[i], i); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function candidateScore(candidate: Candidate) {
  const buf = await fetchImage(candidate.url);
  if (!buf) return null;
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height || meta.width < 180 || meta.height < 250) return null;
  let best: any = null;
  for (const crop of cropOptions(meta.width, meta.height)) {
    try {
      const score = await scoreCrop(buf, crop);
      if (!best || score > best.score) best = { score, crop };
    } catch {}
  }
  return best ? { ...best, candidate, buf } : null;
}

async function processManga(manga: Manga, index: number, total: number) {
  const wanted = `/uploads/mangas/scene-covers/${manga.slug}.webp`;
  if (!force && manga.cover_local_path === wanted && existsSync(path.join(outDir, `${manga.slug}.webp`))) {
    console.log(`[${index}/${total}] SKIP ${manga.slug}`);
    return { ok: true, skipped: true };
  }

  const chapters = db.prepare("SELECT chapter_number, source_url FROM manga_chapters WHERE manga_id=? ORDER BY chapter_number DESC").all(manga.id) as Chapter[];
  const selected = pickChapters(chapters);
  const candidates: Candidate[] = [];
  for (const ch of selected) {
    const html = await fetchText(ch.source_url);
    if (!html) continue;
    candidates.push(...extractChapterImages(html, manga.slug, ch.chapter_number));
    if (candidates.length >= perMangaLimit) break;
  }
  const unique = Array.from(new Map(candidates.map((c) => [c.url, c])).values()).slice(0, perMangaLimit);
  const scored = (await mapLimit(unique, 5, candidateScore)).filter(Boolean) as any[];
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) {
    console.log(`[${index}/${total}] FAIL ${manga.slug} | liveCandidates=${unique.length}`);
    return { ok: false };
  }
  if (!dryRun) {
    await sharp(best.buf)
      .extract(best.crop)
      .resize(600, 900, { fit: "cover", position: "attention" })
      .webp({ quality: 87, effort: 4 })
      .toFile(path.join(outDir, `${manga.slug}.webp`));
    db.prepare("UPDATE mangas SET cover_local_path=?, cover_url=?, updated_at=datetime('now') WHERE id=?").run(wanted, best.candidate.url, manga.id);
  }
  console.log(`[${index}/${total}] OK ${manga.slug} | score=${best.score.toFixed(1)} | ch=${best.candidate.chapter} | candidates=${unique.length}`);
  return { ok: true, skipped: false };
}

async function main() {
  let mangas: Manga[];
  if (explicitSlugs.length) {
    mangas = explicitSlugs.map((slug) => db.prepare("SELECT id, slug, title, cover_local_path FROM mangas WHERE slug=?").get(slug) as Manga).filter(Boolean);
  } else {
    mangas = db.prepare(`SELECT id, slug, title, cover_local_path FROM mangas WHERE source='mangaonline.blue' ORDER BY title LIMIT CASE WHEN ? > 0 THEN ? ELSE -1 END OFFSET ?`).all(max, max, offset) as Manga[];
  }
  console.log(`Live scene covers: mangas=${mangas.length} force=${force} imageLimit=${perMangaLimit} dryRun=${dryRun}`);
  let ok = 0, fail = 0, skipped = 0;
  for (let i = 0; i < mangas.length; i++) {
    const r = await processManga(mangas[i], i+1, mangas.length);
    if (r.ok) ok++; else fail++;
    if ((r as any).skipped) skipped++;
  }
  const stats = db.prepare("SELECT COUNT(*) total, SUM(CASE WHEN cover_local_path LIKE '/uploads/mangas/scene-covers/%' THEN 1 ELSE 0 END) scene FROM mangas WHERE source='mangaonline.blue'").get();
  console.log(JSON.stringify({ ok, fail, skipped, stats }, null, 2));
}

main().finally(() => db.close());
