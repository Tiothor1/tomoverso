import Database = require("better-sqlite3");
import sharp = require("sharp");
import { existsSync, mkdirSync, rmSync, readdirSync } from "fs";
import * as path from "path";

type MangaRow = {
  id: string;
  slug: string;
  title: string;
  cover_local_path: string | null;
};

type PageCandidate = {
  manga_id: string;
  manga_slug: string;
  title: string;
  chapter_slug: string;
  chapter_number: number;
  page_number: number;
  image_url: string;
};

type CropCandidate = {
  left: number;
  top: number;
  width: number;
  height: number;
  yRatio: number;
};

type ScoredCrop = CropCandidate & {
  score: number;
  meta: Record<string, number>;
  imageUrl: string;
  chapterSlug: string;
  chapterNumber: number;
};

const args = new Set(process.argv.slice(2));
const getArg = (name: string, fallback: string) => {
  const pref = `${name}=`;
  const found = process.argv.slice(2).find((a) => a.startsWith(pref));
  return found ? found.slice(pref.length) : fallback;
};

const max = Number(getArg("--max", "0"));
const offset = Number(getArg("--offset", "0"));
const candidateLimit = Number(getArg("--candidate-limit", "18"));
const force = args.has("--force");
const dryRun = args.has("--dry-run");
const cleanup = args.has("--cleanup");

const db = new Database("data/tomoverso.db");
db.pragma("foreign_keys = ON");

const outDir = path.join("public", "uploads", "mangas", "scene-covers");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const mangas = db
  .prepare(
    `SELECT id, slug, title, cover_local_path
     FROM mangas
     WHERE source = 'mangaonline.blue'
     ORDER BY title ASC
     LIMIT CASE WHEN ? > 0 THEN ? ELSE -1 END OFFSET ?`
  )
  .all(max, max, offset) as MangaRow[];

const pageStmt = db.prepare(
  `SELECT m.id AS manga_id, m.slug AS manga_slug, m.title, ch.slug AS chapter_slug,
          ch.chapter_number, p.page_number, coalesce(p.image_url, p.local_path) AS image_url
   FROM mangas m
   JOIN manga_chapters ch ON ch.manga_id = m.id
   JOIN manga_pages p ON p.chapter_id = ch.id
   WHERE m.id = ? AND coalesce(p.image_url, p.local_path, '') <> ''
   ORDER BY ch.chapter_number ASC, p.page_number ASC`
);

const updateStmt = db.prepare(
  `UPDATE mangas
   SET cover_local_path = ?, cover_url = ?, updated_at = datetime('now')
   WHERE id = ?`
);

function pickSample<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  const indexes = new Set<number>();

  // Evita só a primeira página/capítulo: pega começo, meio e fim.
  const anchors = [0.03, 0.07, 0.12, 0.18, 0.25, 0.34, 0.43, 0.52, 0.61, 0.70, 0.79, 0.88, 0.94, 0.98];
  for (const a of anchors) indexes.add(Math.min(items.length - 1, Math.max(0, Math.floor(items.length * a))));

  // Algumas páginas iniciais ainda podem ter protagonist/title spread.
  for (let i = 0; i < Math.min(4, items.length); i++) indexes.add(i);
  for (let i = Math.max(0, items.length - 4); i < items.length; i++) indexes.add(i);

  // Determinístico, espalhado, até bater o limite.
  let step = Math.max(1, Math.floor(items.length / limit));
  for (let i = 0; indexes.size < limit && i < items.length; i += step) indexes.add(i);

  return Array.from(indexes)
    .sort((a, b) => a - b)
    .slice(0, limit)
    .map((i) => items[i]);
}

function decodeUrl(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

async function fetchImage(url: string): Promise<Buffer | null> {
  url = decodeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": "https://mangaonline.blue/",
      },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 8_000) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function makeCropCandidates(width: number, height: number): CropCandidate[] {
  const target = 2 / 3;
  const crops: CropCandidate[] = [];
  if (width < 180 || height < 260) return crops;

  let cropW = width;
  let cropH = Math.round(width / target); // width * 1.5
  if (cropH > height) {
    cropH = height;
    cropW = Math.round(height * target);
  }
  cropW = Math.max(120, Math.min(cropW, width));
  cropH = Math.max(180, Math.min(cropH, height));

  const xs = width > cropW ? [0.18, 0.5, 0.82] : [0.5];
  const yPositions = height > cropH
    ? [0.04, 0.12, 0.22, 0.34, 0.46, 0.58, 0.70, 0.82]
    : [0.5];

  const seen = new Set<string>();
  for (const xr of xs) {
    for (const yr of yPositions) {
      const left = Math.max(0, Math.min(width - cropW, Math.round((width - cropW) * xr)));
      const top = Math.max(0, Math.min(height - cropH, Math.round((height - cropH) * yr)));
      const key = `${left}:${top}:${cropW}:${cropH}`;
      if (seen.has(key)) continue;
      seen.add(key);
      crops.push({ left, top, width: cropW, height: cropH, yRatio: height > cropH ? top / (height - cropH) : 0.5 });
    }
  }
  return crops;
}

async function scoreCrop(buffer: Buffer, crop: CropCandidate): Promise<{ score: number; meta: Record<string, number> } | null> {
  try {
    const resized = await sharp(buffer)
      .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
      .resize(96, 144, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer();

    const n = resized.length / 3;
    let lumSum = 0;
    let lumSq = 0;
    let satSum = 0;
    let skin = 0;
    let white = 0;
    let black = 0;
    let mid = 0;
    let edge = 0;
    const w = 96;
    const h = 144;
    const lums = new Float32Array(n);

    for (let i = 0, p = 0; i < resized.length; i += 3, p++) {
      const r = resized[i];
      const g = resized[i + 1];
      const b = resized[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = max === 0 ? 0 : (max - min) / max;
      lums[p] = lum;
      lumSum += lum;
      lumSq += lum * lum;
      satSum += sat;
      if (lum > 238 && sat < 0.12) white++;
      if (lum < 20) black++;
      if (lum > 45 && lum < 220) mid++;
      // Skin-ish tones help pick protagonist/face crops when colored.
      if (r > 85 && g > 45 && b > 25 && r > g * 1.04 && g > b * 1.05 && r - b > 25) skin++;
    }
    for (let y = 1; y < h; y++) {
      for (let x = 1; x < w; x++) {
        const idx = y * w + x;
        edge += Math.abs(lums[idx] - lums[idx - 1]) + Math.abs(lums[idx] - lums[idx - w]);
      }
    }
    edge /= (w - 1) * (h - 1) * 2;

    const mean = lumSum / n;
    const variance = Math.max(0, lumSq / n - mean * mean);
    const std = Math.sqrt(variance);
    const sat = satSum / n;
    const whiteRatio = white / n;
    const blackRatio = black / n;
    const midRatio = mid / n;
    const skinRatio = skin / n;

    const centerBonus = 1 - Math.abs(crop.yRatio - 0.42); // evita crédito/rodapé/topo puro, mas ainda aceita começo.
    const exposurePenalty = Math.max(0, whiteRatio - 0.35) * 145 + Math.max(0, blackRatio - 0.55) * 65;
    const balanceBonus = Math.max(0, 1 - Math.abs(mean - 128) / 128) * 22;
    const characterBonus = Math.min(1, skinRatio * 8) * 68;
    const abstractPenalty = skinRatio < 0.012 && sat > 0.42 ? 78 : 0;

    let score = 0;
    score += std * 1.18;
    score += edge * 0.68;
    score += sat * 34;
    score += midRatio * 24;
    score += characterBonus;
    score += centerBonus * 18;
    score += balanceBonus;
    score -= exposurePenalty;
    score -= abstractPenalty;

    // Páginas quase brancas/pretas, splash abstrato ou texto puro não servem como capa.
    if (whiteRatio > 0.66 || blackRatio > 0.78) score -= 140;
    if (std < 18 && sat < 0.08) score -= 90;

    return {
      score,
      meta: {
        mean: Number(mean.toFixed(1)),
        std: Number(std.toFixed(1)),
        sat: Number(sat.toFixed(3)),
        edge: Number(edge.toFixed(1)),
        whiteRatio: Number(whiteRatio.toFixed(3)),
        blackRatio: Number(blackRatio.toFixed(3)),
        skinRatio: Number(skinRatio.toFixed(3)),
      },
    };
  } catch {
    return null;
  }
}

async function bestCropForImage(page: PageCandidate): Promise<{ buffer: Buffer; scored: ScoredCrop } | null> {
  const buffer = await fetchImage(page.image_url);
  if (!buffer) return null;
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    return null;
  }
  const width = meta.width || 0;
  const height = meta.height || 0;
  const crops = makeCropCandidates(width, height);
  let best: ScoredCrop | null = null;
  for (const crop of crops) {
    const scored = await scoreCrop(buffer, crop);
    if (!scored) continue;
    const full: ScoredCrop = {
      ...crop,
      score: scored.score,
      meta: scored.meta,
      imageUrl: page.image_url,
      chapterSlug: page.chapter_slug,
      chapterNumber: page.chapter_number,
    };
    if (!best || full.score > best.score) best = full;
  }
  if (!best) return null;
  return { buffer, scored: best };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function processManga(manga: MangaRow, index: number) {
  const allPages = pageStmt.all(manga.id) as PageCandidate[];
  const pages = pickSample(allPages, candidateLimit).filter((p) => /^https?:\/\//.test(p.image_url));
  const results = await mapLimit(pages, 4, async (page) => bestCropForImage(page));
  let best: { buffer: Buffer; scored: ScoredCrop } | null = null;
  for (const current of results) {
    if (!current) continue;
    if (!best || current.scored.score > best.scored.score) best = current;
  }
  const tried = pages.length;

  if (!best) {
    console.log(`[${index}/${mangas.length}] FAIL ${manga.slug} | candidates=${pages.length}`);
    return { ok: false, slug: manga.slug };
  }

  const outRel = `/uploads/mangas/scene-covers/${manga.slug}.webp`;
  const outAbs = path.join(outDir, `${manga.slug}.webp`);
  if (!dryRun) {
    await sharp(best.buffer)
      .extract({ left: best.scored.left, top: best.scored.top, width: best.scored.width, height: best.scored.height })
      .resize(600, 900, { fit: "cover", position: "attention" })
      .webp({ quality: 86, effort: 4 })
      .toFile(outAbs);
    updateStmt.run(outRel, best.scored.imageUrl, manga.id);
  }

  console.log(
    `[${index}/${mangas.length}] OK ${manga.slug} | score=${best.scored.score.toFixed(1)} | ch=${best.scored.chapterNumber} | tried=${tried}/${allPages.length} | ${outRel}`
  );
  return { ok: true, slug: manga.slug, score: best.scored.score, outRel };
}

async function main() {
  console.log(`Mangas mangaonline.blue: ${mangas.length} | candidateLimit=${candidateLimit} | force=${force} | dryRun=${dryRun}`);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < mangas.length; i++) {
    const manga = mangas[i];
    const wanted = `/uploads/mangas/scene-covers/${manga.slug}.webp`;
    if (!force && manga.cover_local_path === wanted && existsSync(path.join(outDir, `${manga.slug}.webp`))) {
      ok++;
      console.log(`[${i + 1}/${mangas.length}] SKIP ${manga.slug}`);
      continue;
    }
    const res = await processManga(manga, i + 1);
    if (res.ok) ok++; else fail++;
  }

  if (cleanup && !dryRun) {
    const referenced = new Set(
      (db.prepare("SELECT cover_local_path p FROM mangas WHERE cover_local_path IS NOT NULL AND cover_local_path <> ''").all() as any[]).map((r) => r.p)
    );
    for (const relDir of ["public/uploads/mangas/locais", "public/uploads/mangas/scene-covers"]) {
      if (!existsSync(relDir)) continue;
      let removed = 0;
      for (const f of readdirSync(relDir)) {
        const rel = `/${relDir.replace(/^public[\\/]/, "").replace(/\\/g, "/")}/${f}`;
        if (!referenced.has(rel)) {
          try { rmSync(path.join(relDir, f), { force: true }); removed++; } catch {}
        }
      }
      console.log(`cleanup ${relDir}: removed=${removed}`);
    }
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) total,
      SUM(CASE WHEN cover_local_path LIKE '/uploads/mangas/scene-covers/%' THEN 1 ELSE 0 END) scene_covers,
      SUM(CASE WHEN source='mangaonline.blue' THEN 1 ELSE 0 END) blue,
      SUM(CASE WHEN source='lermangas.me' OR coalesce(source_url,'') LIKE '%lermangas.me%' THEN 1 ELSE 0 END) lermangas
    FROM mangas
  `).get();
  console.log(JSON.stringify({ ok, fail, stats }, null, 2));
}

main().finally(() => db.close());
