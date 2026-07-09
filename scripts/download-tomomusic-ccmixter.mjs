import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'tomomusic');
const TRACK_DIR = path.join(OUT_DIR, 'tracks');
const COVER_DIR = path.join(OUT_DIR, 'covers');
const META_PATH = path.join(ROOT, 'src', 'lib', 'tomomusic', 'seed-tracks.generated.json');

const TERMS = ['lofi', 'ambient', 'piano', 'study', 'chill', 'fantasy', 'rain', 'sleep', 'reading', 'jazz'];
const MAX_TRACKS = Number(process.env.TOMOMUSIC_MAX_TRACKS || 10);
const MAX_TOTAL_BYTES = Number(process.env.TOMOMUSIC_MAX_TOTAL_MB || 95) * 1024 * 1024;
const MAX_PER_TRACK_BYTES = Number(process.env.TOMOMUSIC_MAX_PER_TRACK_MB || 18) * 1024 * 1024;

fs.mkdirSync(TRACK_DIR, { recursive: true });
fs.mkdirSync(COVER_DIR, { recursive: true });
fs.mkdirSync(path.dirname(META_PATH), { recursive: true });

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'track';
}

function durationToSeconds(raw) {
  if (!raw || typeof raw !== 'string') return 0;
  const parts = raw.split(':').map((x) => Number.parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function isCommercialSafeLicense(item) {
  const licenseUrl = String(item.license_url || '').toLowerCase();
  const licenseName = String(item.license_name || '').toLowerCase();
  const tags = `${item.upload_tags || ''} ${JSON.stringify(item.upload_extra || {})}`.toLowerCase();
  if (!licenseUrl || !licenseName) return false;
  if (licenseUrl.includes('/nc/') || licenseName.includes('noncommercial') || licenseName.includes('non-commercial')) return false;
  if (licenseUrl.includes('/nd/') || licenseName.includes('no derivatives')) return false;
  if (tags.includes('non_commercial')) return false;
  return licenseUrl.includes('creativecommons.org/licenses/by') || licenseUrl.includes('creativecommons.org/publicdomain/zero') || licenseUrl.includes('creativecommons.org/licenses/publicdomain');
}

function fetchBodyViaRawSocket(host, reqPath) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';
    socket.setTimeout(20000);
    socket.connect(80, host, () => {
      socket.write(`GET ${reqPath} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: Tomoverso-TomoMusic/1.0\r\nAccept: application/json\r\nConnection: close\r\n\r\n`);
    });
    socket.on('data', (chunk) => { response += chunk.toString('utf8'); });
    socket.on('end', () => {
      const body = response.slice(response.indexOf('\r\n\r\n') + 4);
      const start = body.indexOf('[{');
      const end = body.lastIndexOf('}]');
      if (start === -1 || end === -1) return reject(new Error('JSON body not found'));
      resolve(body.slice(start, end + 2).trim());
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('CCMixter API timeout')); });
  });
}

async function queryTerm(term) {
  const reqPath = `/api/query?datasource=tracks&f=json&limit=35&search=${encodeURIComponent(term)}`;
  const body = await fetchBodyViaRawSocket('ccmixter.org', reqPath);
  return JSON.parse(body);
}

async function download(url, dest) {
  const directUrl = url.replace('https://ccmixter.org/', 'http://ccmixter.org/');
  const tmp = `${dest}.tmp`;
  try { fs.unlinkSync(tmp); } catch {}
  const res = spawnSync('curl', [
    '-L',
    '--fail',
    '--retry', '2',
    '--connect-timeout', '20',
    '--max-time', '180',
    '-A', 'Tomoverso-TomoMusic/1.0',
    '-e', 'https://ccmixter.org/',
    '-o', tmp,
    directUrl,
  ], { stdio: 'inherit' });
  if (res.status !== 0) {
    try { fs.unlinkSync(tmp); } catch {}
    throw new Error(`curl failed (${res.status}) for ${directUrl}`);
  }
  try {
    fs.renameSync(tmp, dest);
  } catch {
    fs.copyFileSync(tmp, dest);
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function coverSvg(track, idx) {
  const palettes = [
    ['#0b1020', '#18384a', '#d8a84d'],
    ['#090b13', '#203b2f', '#e4c06f'],
    ['#0a0710', '#39264f', '#c9984b'],
    ['#080d13', '#22385f', '#9bc4d9'],
    ['#100b08', '#3f2b18', '#f2c16d'],
  ];
  const [a, b, c] = palettes[idx % palettes.length];
  const title = String(track.title).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const artist = String(track.artist).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <radialGradient id="g" cx="35%" cy="25%" r="78%"><stop stop-color="${b}"/><stop offset="1" stop-color="${a}"/></radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.13"/></feComponentTransfer></filter>
  </defs>
  <rect width="900" height="900" fill="url(#g)"/>
  <rect width="900" height="900" filter="url(#grain)" opacity=".35"/>
  <circle cx="700" cy="160" r="110" fill="${c}" opacity=".18"/>
  <circle cx="170" cy="690" r="190" fill="${c}" opacity=".08"/>
  <path d="M130 578c92-92 191-113 294-40 70 50 133 47 202-9 52-42 99-51 144-28v149H130z" fill="#ffffff" opacity=".06"/>
  <path d="M205 283c86-54 172-54 258 0 86 54 172 54 258 0" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" opacity=".22"/>
  <text x="78" y="108" fill="${c}" font-family="Georgia,serif" font-size="30" letter-spacing="8">TOMOMUSIC</text>
  <text x="78" y="735" fill="#fff8e8" font-family="Inter,Arial,sans-serif" font-size="54" font-weight="800">${title.slice(0, 24)}</text>
  <text x="78" y="790" fill="#d5c8a6" font-family="Inter,Arial,sans-serif" font-size="28">${artist.slice(0, 36)}</text>
  <text x="78" y="835" fill="${c}" font-family="Inter,Arial,sans-serif" font-size="18" letter-spacing="3">ROYALTY-FREE • CREATIVE COMMONS</text>
</svg>`;
}

const seen = new Set();
const candidates = [];
for (const term of TERMS) {
  console.log(`Query ${term}...`);
  let rows = [];
  try { rows = await queryTerm(term); } catch (e) { console.warn(`Query failed ${term}:`, e.message); continue; }
  for (const item of rows) {
    if (seen.has(item.upload_id)) continue;
    seen.add(item.upload_id);
    if (!isCommercialSafeLicense(item)) continue;
    const tagBlob = String(item.upload_tags || '').toLowerCase();
    if (/(acappella|male_vocals|female_vocals|spoken|rap|vocal|vocals|preview)/.test(tagBlob)) continue;
    const file = (item.files || []).find((f) => {
      const name = String(f.file_name || '').toLowerCase();
      const mime = f.file_format_info?.mime_type || '';
      return name.endsWith('.mp3') && mime.includes('audio') && Number(f.file_rawsize || 0) > 500000 && Number(f.file_rawsize || 0) <= MAX_PER_TRACK_BYTES;
    });
    if (!file?.download_url) continue;
    const duration = durationToSeconds(file.file_format_info?.ps);
    if (duration < 90) continue;
    candidates.push({ item, file, term, duration, size: Number(file.file_rawsize || 0) });
  }
}

candidates.sort((a, b) => {
  const aw = (a.item.upload_tags || '').includes('editorial_pick') ? 1 : 0;
  const bw = (b.item.upload_tags || '').includes('editorial_pick') ? 1 : 0;
  return bw - aw || a.size - b.size;
});

let total = 0;
const selected = [];
for (const c of candidates) {
  if (selected.length >= MAX_TRACKS) break;
  if (total + c.size > MAX_TOTAL_BYTES) continue;
  total += c.size;
  selected.push(c);
}

console.log(`Candidates safe: ${candidates.length}. Selected ${selected.length}, total ${(total/1024/1024).toFixed(1)}MB`);

const tracks = [];
let idx = 0;
for (const c of selected) {
  idx += 1;
  const item = c.item;
  const file = c.file;
  const base = `${String(idx).padStart(2, '0')}-${slugify(item.upload_name)}-${slugify(item.user_real_name || item.user_name)}`;
  const fileName = `${base}.mp3`;
  const coverName = `${base}.svg`;
  const dest = path.join(TRACK_DIR, fileName);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < Math.max(100000, c.size * 0.97)) {
    console.log(`Downloading ${item.upload_name} — ${item.user_real_name || item.user_name} (${(c.size/1024/1024).toFixed(1)}MB)`);
    await download(file.download_url, dest);
  }
  fs.writeFileSync(path.join(COVER_DIR, coverName), coverSvg({ title: item.upload_name, artist: item.user_real_name || item.user_name }, idx - 1));
  tracks.push({
    id: `ccmixter-${item.upload_id}`,
    title: item.upload_name,
    artist: item.user_real_name || item.user_name,
    description: `Faixa Creative Commons selecionada para leitura no Tomoverso. Tags: ${String(item.upload_tags || '').split(',').filter(Boolean).slice(0, 10).join(', ')}`,
    mood: c.term,
    genre: (String(item.upload_tags || '').includes('jazz') ? 'jazz lofi' : String(item.upload_tags || '').includes('ambient') ? 'ambient' : 'lofi / leitura'),
    duration_seconds: c.duration,
    file_url: `/audio/tomomusic/tracks/${fileName}`,
    cover_url: `/audio/tomomusic/covers/${coverName}`,
    source_url: item.file_page_url,
    license_name: item.license_name,
    license_url: item.license_url,
    attribution_required: true,
    attribution_text: `${item.upload_name} — ${item.user_real_name || item.user_name} (${item.license_name}). Fonte: ${item.file_page_url}. Licença: ${item.license_url}`,
    source: 'ccMixter',
    downloaded_at: new Date().toISOString(),
    local_file: `public/audio/tomomusic/tracks/${fileName}`,
    bytes: fs.statSync(dest).size,
  });
}

fs.writeFileSync(META_PATH, JSON.stringify(tracks, null, 2) + '\n');
console.log(`Wrote ${META_PATH}`);
console.log(JSON.stringify({ tracks: tracks.length, totalBytes: tracks.reduce((n, t) => n + t.bytes, 0), licenses: [...new Set(tracks.map((t) => t.license_name))] }, null, 2));
