import Database = require("better-sqlite3");
import sharp = require("sharp");
import { existsSync, mkdirSync } from "fs";
import * as path from "path";

const db = new Database("data/tomoverso.db");
const outDir = path.join("public", "uploads", "mangas", "scene-covers");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://mangaonline.blue/" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return await res.text();
}

async function fetchImage(url: string): Promise<Buffer | null> {
  url = decodeHtml(url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      Referer: "https://mangaonline.blue/",
    },
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8_000) return null;
  try { await sharp(buf).metadata(); return buf; } catch { return null; }
}

function extractImages(html: string): string[] {
  const urls = new Set<string>();
  const imgRe = /<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const tag = m[0];
    const url = decodeHtml(m[1]);
    if (!/\/WP-manga\/data\//i.test(url)) continue;
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(url)) continue;
    // Prefere imagens do leitor, mas aceita todas do WP-manga/data.
    if (/logo|cropped|avatar|favicon/i.test(url + tag)) continue;
    urls.add(url);
  }
  const rawRe = /https?:\/\/[^"'\s<>]+\/WP-manga\/data\/[^"'\s<>]+?\.(?:jpe?g|png|webp)/gi;
  while ((m = rawRe.exec(html))) urls.add(decodeHtml(m[0]));
  return Array.from(urls);
}

function cropOptions(width: number, height: number) {
  const target = 2 / 3;
  let cropW = width;
  let cropH = Math.round(width / target);
  if (cropH > height) {
    cropH = height;
    cropW = Math.round(height * target);
  }
  cropW = Math.max(120, Math.min(cropW, width));
  cropH = Math.max(180, Math.min(cropH, height));
  const xs = width > cropW ? [0.2, 0.5, 0.8] : [0.5];
  const ys = height > cropH ? [0.08, 0.22, 0.38, 0.54, 0.70, 0.84] : [0.5];
  const out: any[] = [];
  for (const xr of xs) for (const yr of ys) {
    out.push({
      left: Math.max(0, Math.min(width - cropW, Math.round((width - cropW) * xr))),
      top: Math.max(0, Math.min(height - cropH, Math.round((height - cropH) * yr))),
      width: cropW,
      height: cropH,
    });
  }
  return out;
}

async function score(buffer: Buffer, crop: any) {
  const small = await sharp(buffer).extract(crop).resize(96, 144).removeAlpha().raw().toBuffer();
  const n = small.length / 3;
  let lum = 0, lum2 = 0, sat = 0, skin = 0, white = 0, black = 0, edge = 0;
  const lums = new Float32Array(n);
  for (let i = 0, p = 0; i < small.length; i += 3, p++) {
    const r = small[i], g = small[i + 1], b = small[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const s = max ? (max - min) / max : 0;
    lums[p] = l; lum += l; lum2 += l*l; sat += s;
    if (l > 238 && s < .12) white++;
    if (l < 20) black++;
    if (r > 85 && g > 45 && b > 25 && r > g * 1.04 && g > b * 1.05 && r - b > 25) skin++;
  }
  for (let y = 1; y < 144; y++) for (let x = 1; x < 96; x++) {
    const idx = y * 96 + x;
    edge += Math.abs(lums[idx] - lums[idx - 1]) + Math.abs(lums[idx] - lums[idx - 96]);
  }
  const mean = lum / n;
  const std = Math.sqrt(Math.max(0, lum2 / n - mean * mean));
  const satR = sat / n, skinR = skin / n, whiteR = white / n, blackR = black / n;
  let s = std * 1.2 + edge / n * 70 + satR * 35 + Math.min(1, skinR * 8) * 70;
  s += Math.max(0, 1 - Math.abs(mean - 128) / 128) * 22;
  s -= Math.max(0, whiteR - 0.35) * 150 + Math.max(0, blackR - 0.60) * 70;
  if (whiteR > .70 || blackR > .82) s -= 150;
  return s;
}

async function processSlug(slug: string) {
  const manga = db.prepare("SELECT id, slug, title FROM mangas WHERE slug = ?").get(slug) as any;
  const chapters = db.prepare("SELECT chapter_number, source_url FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number DESC").all(manga.id) as any[];
  const selected = [...chapters.slice(0, 4), ...chapters.slice(Math.max(0, Math.floor(chapters.length / 2) - 2), Math.floor(chapters.length / 2) + 3), ...chapters.slice(-4)];
  const urls = new Set<string>();
  for (const ch of selected) {
    try {
      const html = await fetchText(ch.source_url);
      for (const u of extractImages(html)) urls.add(u);
    } catch (e: any) {
      console.log(`WARN ${slug} chapter ${ch.chapter_number}: ${e.message}`);
    }
  }
  console.log(`${slug}: live image candidates=${urls.size}`);
  let best: any = null;
  let checked = 0;
  for (const url of Array.from(urls).slice(0, 220)) {
    const buf = await fetchImage(url);
    if (!buf) continue;
    checked++;
    const meta = await sharp(buf).metadata();
    const crops = cropOptions(meta.width || 0, meta.height || 0);
    for (const crop of crops) {
      try {
        const s = await score(buf, crop);
        if (!best || s > best.score) best = { score: s, url, buf, crop };
      } catch {}
    }
  }
  if (!best) throw new Error(`No live usable image for ${slug}; checked=${checked}`);
  const outRel = `/uploads/mangas/scene-covers/${slug}.webp`;
  const outAbs = path.join(outDir, `${slug}.webp`);
  await sharp(best.buf)
    .extract(best.crop)
    .resize(600, 900, { fit: "cover", position: "attention" })
    .webp({ quality: 86, effort: 4 })
    .toFile(outAbs);
  db.prepare("UPDATE mangas SET cover_local_path = ?, cover_url = ?, updated_at=datetime('now') WHERE id = ?").run(outRel, best.url, manga.id);
  console.log(`OK ${slug}: score=${best.score.toFixed(1)} checked=${checked} ${outRel}`);
}

async function main() {
  for (const slug of process.argv.slice(2)) await processSlug(slug);
  console.log(db.prepare("SELECT COUNT(*) c FROM mangas WHERE source='mangaonline.blue' AND cover_local_path LIKE '/uploads/mangas/scene-covers/%'").get());
}

main().finally(() => db.close());
