const Database = require('better-sqlite3');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const db = new Database('data/tomoverso.db');
const outDir = path.join(process.cwd(), 'public', 'uploads', 'novels', 'centralnovel');
fs.mkdirSync(outDir, { recursive: true });

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"');
}

function normalizeWpUrl(url) {
  return decodeHtml(url)
    .replace(/^https:\/\/i\d+\.wp\.com\//i, 'https://')
    .replace(/\?resize=\d+,\d+.*$/i, '');
}

function pickCentralNovelCover(html, title) {
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const titleWords = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const candidates = [];

  for (const tag of imgs) {
    const src = tag.match(/(?:data-src|data-lazy-src|data-original|src)=["']([^"']+)["']/i)?.[1];
    if (!src || !/^https?:/i.test(src)) continue;
    const url = decodeHtml(src);
    const low = url.toLowerCase();
    if (!/wp-content\/uploads/i.test(low)) continue;
    if (/logo|loading|blank|gravatar|avatar|emoji|icon|banner/i.test(low)) continue;

    const alt = decodeHtml(tag.match(/alt=["']([^"']*)["']/i)?.[1] || '');
    const cls = decodeHtml(tag.match(/class=["']([^"']*)["']/i)?.[1] || '');
    const blob = `${low} ${alt.toLowerCase()} ${cls.toLowerCase()}`;
    const resize = url.match(/resize=(\d+),(\d+)/i);
    const w = resize ? Number(resize[1]) : 0;
    const h = resize ? Number(resize[2]) : 0;
    const titleHits = titleWords.reduce((n, w) => n + (blob.includes(w) ? 1 : 0), 0);
    const coverHint = /capa|cover|central/i.test(blob) ? 900 : 0;
    const portrait = h > w ? 300 : -200;
    const tinyPenalty = w && h && (w < 180 || h < 240) ? -900 : 0;
    const score = coverHint + titleHits * 220 + portrait + (w * h) / 1000 + tinyPenalty;
    candidates.push({ url: normalizeWpUrl(url), score, raw: url });
  }

  const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1]
    || html.match(/name=["']twitter:image["'][^>]+content=["']([^"']+)/i)?.[1];
  if (og) candidates.push({ url: normalizeWpUrl(og), score: 700, raw: og });

  return candidates.sort((a, b) => b.score - a.score)[0]?.url || null;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Tomoverso cover bot' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`GET ${url} => ${res.status}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Tomoverso cover bot', Referer: 'https://centralnovel.com/' }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`IMG ${url} => ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function normalizeCover(buffer) {
  const width = 600;
  const height = 900;
  const bg = await sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .blur(18)
    .modulate({ brightness: 0.58, saturation: 0.92 })
    .webp({ quality: 82 })
    .toBuffer();
  const fg = await sharp(buffer)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 94 })
    .toBuffer();
  const frame = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000" flood-opacity="0.5"/></filter></defs><rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="22" fill="rgba(0,0,0,.18)" filter="url(#s)"/><rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="24" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/></svg>`);
  return sharp(bg)
    .composite([{ input: frame, left: 0, top: 0 }, { input: fg, left: 0, top: 0 }])
    .webp({ quality: 90, effort: 4 })
    .toBuffer();
}

(async () => {
  const rows = db.prepare(`
    SELECT id, slug, title, source_url
    FROM novels
    WHERE type='light-novel'
      AND source='centralnovel'
      AND slug <> 'cn-list-mode'
      AND (cover_local_path IS NULL OR trim(cover_local_path)='' OR cover_local_path LIKE '%.svg' OR cover_local_path LIKE '%placeholder%')
      AND (cover_url IS NULL OR trim(cover_url)='' OR cover_url LIKE '%.svg' OR cover_url LIKE '%placeholder%')
    ORDER BY title
  `).all();

  const updated = [];
  const failed = [];
  for (const row of rows) {
    try {
      const html = await fetchText(row.source_url);
      const coverUrl = pickCentralNovelCover(html, row.title);
      if (!coverUrl) throw new Error('source cover not found');
      const raw = await fetchBuffer(coverUrl);
      const final = await normalizeCover(raw);
      const fileName = `${row.slug}-cover.webp`;
      const publicPath = `/uploads/novels/centralnovel/${fileName}`;
      fs.writeFileSync(path.join(outDir, fileName), final);
      db.prepare(`UPDATE novels SET cover_local_path=?, cover_url=?, cover_source_url=?, updated_at=datetime('now') WHERE id=?`).run(publicPath, publicPath, coverUrl, row.id);
      updated.push({ slug: row.slug, title: row.title, coverUrl });
      console.log(`updated ${row.slug}`);
    } catch (e) {
      failed.push({ slug: row.slug, title: row.title, error: e.message });
      console.error(`failed ${row.slug}: ${e.message}`);
    }
  }

  const junk = db.prepare(`SELECT id FROM novels WHERE slug='cn-list-mode'`).get();
  if (junk) {
    db.prepare(`
      INSERT INTO catalog_controls (id, item_type, item_id, is_hidden, updated_at)
      VALUES (?, 'novel', ?, 1, datetime('now'))
      ON CONFLICT(item_type, item_id) DO UPDATE SET is_hidden=1, updated_at=datetime('now')
    `).run('hide-cn-list-mode', junk.id);
  }

  const missing = db.prepare(`SELECT COUNT(*) c FROM novels WHERE type='light-novel' AND slug <> 'cn-list-mode' AND (cover_local_path IS NULL OR trim(cover_local_path)='') AND (cover_url IS NULL OR trim(cover_url)='')`).get().c;
  console.log(JSON.stringify({ updated: updated.length, failed, missingRealLightNovels: missing }, null, 2));
  if (failed.length || missing) process.exit(1);
})();
