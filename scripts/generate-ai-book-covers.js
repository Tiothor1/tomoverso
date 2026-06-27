const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Database = require('better-sqlite3');

const ROOT = process.cwd();
const catalogPath = path.join(ROOT, 'data/catalog/tomoverso-original-books.json');
const publicCatalogPath = path.join(ROOT, 'public/catalog/tomoverso-original-books.json');
const books = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const outDir = path.join(ROOT, 'public/uploads/books/ai-covers');
const rawDir = path.join(outDir, '_raw');
// Resume-safe: do not delete existing generated covers.
fs.mkdirSync(rawDir, { recursive: true });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function wrap(text, max = 18, maxLines = 4) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}
function titleOverlay(book) {
  const lines = wrap(book.title, book.title.length > 31 ? 15 : 18, 4);
  const size = lines.length >= 4 ? 38 : lines.length === 3 ? 45 : 54;
  const gap = size + 4;
  const startY = 682 - Math.max(0, lines.length - 2) * 18;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="30%" stop-color="#000" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.96"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.8"/></filter>
  </defs>
  <rect x="0" y="560" width="600" height="340" fill="url(#fade)"/>
  <g filter="url(#shadow)">
    <text x="300" y="630" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="900" letter-spacing="4" fill="#fff" opacity="0.78">TOMOVERSO ORIGINAL</text>
    ${lines.map((line, i) => `<text x="300" y="${startY + i * gap}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="900" fill="#fff">${esc(line)}</text>`).join('\n')}
    <text x="300" y="858" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="2.2" fill="#fff" opacity="0.74">${esc(book.mainGenre.toUpperCase())}</text>
  </g>
</svg>`);
}
function cleanPrompt(p) {
  return p
    .replace(/Título integrado na capa:[^\.]+\./gi, '')
    .replace(/Title text may be[^\.]+\./gi, '')
    .replace(/espaço no topo para título,?/gi, '')
    .replace(/sem logotipos/gi, 'no logos')
    .trim();
}
function buildPrompt(book) {
  return [
    cleanPrompt(book.gptImage2CoverPrompt),
    'Create a polished professional anime / semi-anime digital painting book cover illustration, premium web novel cover quality, cinematic lighting, detailed characters, strong composition, emotional expression, attractive catalog thumbnail, vertical portrait 2:3.',
    'IMPORTANT: no text, no typography, no title letters, no logos, no watermark, no signature. Leave the lower area slightly darker and visually clean for title overlay. Original characters only, no existing franchise characters.'
  ].join(' ');
}
async function download(url, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 TomoversoCoverBot/1.0' }, signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      const buf = Buffer.from(await res.arrayBuffer());
      if (!type.startsWith('image/') || buf.length < 20000) throw new Error(`bad image response type=${type} bytes=${buf.length}`);
      return buf;
    } catch (err) {
      last = err;
      await sleep(2500 * (i + 1));
    }
  }
  throw last;
}
async function generateOne(book, index) {
  const finalPath = path.join(outDir, `${book.slug}.webp`);
  if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 20000) {
    return finalPath;
  }
  const seed = hash(book.slug) % 999999;
  const prompt = buildPrompt(book);
  const shortPrompt = [
    `Professional anime semi-anime premium book cover illustration for an original ${book.mainGenre} story.`,
    book.coverIdea,
    `Main title will be added later, so generate image only: no text, no words, no logo, no watermark.`,
    `Vertical 2:3, cinematic lighting, detailed expressive characters, strong scene, polished web novel cover, original characters only.`
  ].join(' ');
  const urls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(shortPrompt)}?width=768&height=1152&model=turbo&nologo=true&private=true&seed=${seed + 2000}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(shortPrompt)}?width=768&height=1152&nologo=true&private=true&seed=${seed + 3000}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(shortPrompt)}?width=768&height=1152&model=flux&nologo=true&private=true&seed=${seed + 1000}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1152&model=flux&nologo=true&private=true&seed=${seed}`
  ];
  let raw, lastErr;
  for (const url of urls) {
    try {
      raw = await download(url, 1);
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!raw) throw lastErr || new Error('image download failed');
  const rawPath = path.join(rawDir, `${book.slug}.jpg`);
  fs.writeFileSync(rawPath, raw);
  const base = await sharp(raw)
    .resize(600, 900, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: 1.06, brightness: 1.01 })
    .webp({ quality: 94, effort: 5 })
    .toBuffer();
  await sharp(base)
    .composite([{ input: titleOverlay(book), left: 0, top: 0 }])
    .webp({ quality: 94, effort: 5 })
    .toFile(finalPath);
  return finalPath;
}

async function main() {
  if (books.length !== 50) throw new Error(`Expected 50 books, got ${books.length}`);
  const failures = [];
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    process.stdout.write(`[${i + 1}/50] ${book.slug} ... `);
    try {
      await generateOne(book, i);
      console.log('ok');
    } catch (err) {
      console.log('FAIL', err.message);
      failures.push({ slug: book.slug, error: err.message });
    }
    await sleep(650);
  }
  if (failures.length) throw new Error(`Failures: ${JSON.stringify(failures, null, 2)}`);
  const enriched = books.map((book) => ({ ...book, generatedCoverPath: `/uploads/books/ai-covers/${book.slug}.webp` }));
  fs.writeFileSync(catalogPath, JSON.stringify(enriched, null, 2), 'utf8');
  fs.mkdirSync(path.dirname(publicCatalogPath), { recursive: true });
  fs.writeFileSync(publicCatalogPath, JSON.stringify(enriched, null, 2), 'utf8');
  const db = new Database(path.join(ROOT, 'data/tomoverso.db'));
  const update = db.prepare("UPDATE books SET cover_url='', cover_local_path=?, updated_at=datetime('now') WHERE slug=?");
  const tx = db.transaction(() => {
    for (const book of books) update.run(`/uploads/books/ai-covers/${book.slug}.webp`, book.slug);
  });
  tx();
  db.close();
  console.log(JSON.stringify({ generated: fs.readdirSync(outDir).filter(f => f.endsWith('.webp')).length, failures: failures.length }, null, 2));
}
main().catch((err) => { console.error(err); process.exit(1); });
