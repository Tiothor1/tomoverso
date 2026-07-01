const Database = require('better-sqlite3');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dbPath = process.argv[2] || 'data/tomoverso.db';
const db = new Database(dbPath);
const outDir = path.join(process.cwd(), 'public', 'uploads', 'novels', 'vndb');
fs.mkdirSync(outDir, { recursive: true });

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Tomoverso/1.0 cover mirror (https://tomoverso.vercel.app)',
      Referer: 'https://vndb.org/',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`IMG ${url} => ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function normalizeCover(buffer) {
  const width = 600;
  const height = 900;
  const bg = await sharp(buffer)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .blur(18)
    .modulate({ brightness: 0.58, saturation: 0.9 })
    .webp({ quality: 82 })
    .toBuffer();
  const fg = await sharp(buffer)
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 94 })
    .toBuffer();
  const frame = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000" flood-opacity="0.5"/></filter></defs><rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="22" fill="rgba(0,0,0,.18)" filter="url(#s)"/><rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="24" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/></svg>`);
  return sharp(bg).composite([{ input: frame, left: 0, top: 0 }, { input: fg, left: 0, top: 0 }]).webp({ quality: 90, effort: 4 }).toBuffer();
}

(async () => {
  const rows = db.prepare(`
    SELECT id, slug, title, cover_url, cover_source_url, cover_local_path
    FROM novels
    WHERE type='visual-novel'
      AND source='vndb'
      AND (cover_local_path IS NULL OR trim(cover_local_path)='' OR cover_local_path NOT LIKE '/uploads/novels/vndb/%')
    ORDER BY created_at DESC
  `).all();

  const updated = [];
  const failed = [];
  for (const row of rows) {
    const src = row.cover_source_url || row.cover_url;
    if (!src || !/^https?:\/\//i.test(src)) {
      failed.push({ slug: row.slug, title: row.title, error: 'no remote cover url' });
      continue;
    }
    try {
      const raw = await fetchBuffer(src);
      const final = await normalizeCover(raw);
      const fileName = `${row.slug}-cover.webp`;
      const publicPath = `/uploads/novels/vndb/${fileName}`;
      fs.writeFileSync(path.join(outDir, fileName), final);
      db.prepare(`UPDATE novels SET cover_local_path=?, cover_url=?, cover_source_url=?, updated_at=datetime('now') WHERE id=?`).run(publicPath, publicPath, src, row.id);
      updated.push({ slug: row.slug, title: row.title, src, publicPath });
      console.log(`updated ${row.slug}`);
    } catch (e) {
      failed.push({ slug: row.slug, title: row.title, error: e.message });
      console.error(`failed ${row.slug}: ${e.message}`);
    }
  }

  const missing = db.prepare(`SELECT COUNT(*) c FROM novels WHERE type='visual-novel' AND (cover_local_path IS NULL OR trim(cover_local_path)='') AND (cover_url IS NULL OR trim(cover_url)='')`).get().c;
  console.log(JSON.stringify({ dbPath, updated: updated.length, failed, missing }, null, 2));
  if (failed.length || missing) process.exit(1);
})();
