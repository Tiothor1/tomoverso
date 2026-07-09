import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawnSync } from 'child_process';
import Database from 'better-sqlite3';

const ROOT = process.cwd();
const STORAGE_ROOT = process.env.TOMOMUSIC_STORAGE_DIR || path.join(ROOT, 'storage', 'audio', 'tomomusic');
const TRACK_DIR = path.join(STORAGE_ROOT, 'tracks');
const COVER_DIR = path.join(STORAGE_ROOT, 'covers');
const PUBLIC_BASE = (process.env.TOMOMUSIC_PUBLIC_BASE || '/audio/tomomusic/storage').replace(/\/$/, '');
const DB_PATH = process.env.TOMOMUSIC_DB_PATH || process.env.DB_PATH || (process.env.DB_DIR ? path.join(process.env.DB_DIR, 'tomoverso.db') : path.join(ROOT, 'data', 'tomoverso.db'));
const TARGET_TOTAL = Number(process.env.TOMOMUSIC_TARGET_TOTAL || 100);
const MAX_NEW_DOWNLOADS = Number(process.env.TOMOMUSIC_MAX_NEW || 120);
const MAX_TOTAL_BYTES = Number(process.env.TOMOMUSIC_MAX_TOTAL_MB || 900) * 1024 * 1024;
const MAX_PER_TRACK_BYTES = Number(process.env.TOMOMUSIC_MAX_PER_TRACK_MB || 25) * 1024 * 1024;
const MIN_DURATION = Number(process.env.TOMOMUSIC_MIN_SECONDS || 100);
const MAX_DURATION = Number(process.env.TOMOMUSIC_MAX_SECONDS || 1800);
const PAGE_LIMIT = Number(process.env.TOMOMUSIC_QUERY_LIMIT || 80);
const PAGES_PER_TERM = Number(process.env.TOMOMUSIC_PAGES_PER_TERM || 4);

const DEFAULT_TERMS = [
  'lofi', 'ambient', 'piano', 'study', 'chill', 'fantasy', 'rain', 'sleep', 'reading', 'jazz',
  'calm', 'dream', 'dreamy', 'night', 'relax', 'relaxing', 'meditation', 'downtempo', 'lounge',
  'cinematic', 'soft', 'acoustic', 'coffee', 'nature', 'atmospheric', 'instrumental', 'melancholy',
  'mellow', 'smooth', 'quiet', 'beat', 'electronic', 'soundscape', 'peaceful', 'story', 'winter',
];
const TERMS = (process.env.TOMOMUSIC_TERMS ? process.env.TOMOMUSIC_TERMS.split(',') : DEFAULT_TERMS)
  .map((x) => x.trim())
  .filter(Boolean);

fs.mkdirSync(TRACK_DIR, { recursive: true });
fs.mkdirSync(COVER_DIR, { recursive: true });

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 82) || 'track';
}

function durationToSeconds(raw) {
  if (!raw || typeof raw !== 'string') return 0;
  const parts = raw.split(':').map((x) => Number.parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function hasClearCommercialSafeLicense(item) {
  const licenseUrl = String(item.license_url || '').toLowerCase();
  const licenseName = String(item.license_name || '').toLowerCase();
  const tags = `${item.upload_tags || ''} ${JSON.stringify(item.upload_extra || {})}`.toLowerCase();
  if (!licenseUrl || !licenseName) return false;
  if (licenseUrl.includes('/nc/') || licenseName.includes('noncommercial') || licenseName.includes('non-commercial')) return false;
  if (licenseUrl.includes('/nd/') || licenseName.includes('no derivatives') || licenseName.includes('noderivs')) return false;
  if (tags.includes('non_commercial') || tags.includes('no_derivatives')) return false;
  return licenseUrl.includes('creativecommons.org/licenses/by') || licenseUrl.includes('creativecommons.org/publicdomain/zero') || licenseUrl.includes('creativecommons.org/licenses/publicdomain');
}

function isReadingFriendly(item) {
  const blob = `${item.upload_name || ''} ${item.upload_tags || ''} ${item.user_name || ''}`.toLowerCase();
  if (/(acappella|a cappella|male_vocals|female_vocals|spoken|speech|rap|rapping|vocal_only|vocals_only|preview|podcast|sermon|interview|karaoke)/.test(blob)) return false;
  if (/(explicit|nsfw|adult|violent|horror scream|scream)/.test(blob)) return false;
  return true;
}

function fetchBodyViaRawSocket(host, reqPath) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';
    socket.setTimeout(25000);
    socket.connect(80, host, () => {
      socket.write(`GET ${reqPath} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: Tomoverso-TomoMusic/1.0\r\nAccept: application/json\r\nConnection: close\r\n\r\n`);
    });
    socket.on('data', (chunk) => { response += chunk.toString('utf8'); });
    socket.on('end', () => {
      const headerEnd = response.indexOf('\r\n\r\n');
      const body = headerEnd >= 0 ? response.slice(headerEnd + 4) : response;
      const start = body.indexOf('[{');
      const end = body.lastIndexOf('}]');
      if (start === -1 || end === -1) return reject(new Error('JSON body not found'));
      resolve(body.slice(start, end + 2).trim());
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('CCMixter API timeout')); });
  });
}

async function queryTerm(term, offset) {
  const reqPath = `/api/query?datasource=tracks&f=json&limit=${PAGE_LIMIT}&offset=${offset}&search=${encodeURIComponent(term)}`;
  const body = await fetchBodyViaRawSocket('ccmixter.org', reqPath);
  return JSON.parse(body);
}

function download(url, dest) {
  const directUrl = String(url).replace('https://ccmixter.org/', 'http://ccmixter.org/');
  const tmp = `${dest}.tmp`;
  try { fs.unlinkSync(tmp); } catch {}
  const res = spawnSync('curl', [
    '-L', '--fail', '--retry', '2', '--connect-timeout', '20', '--max-time', '240',
    '-A', 'Tomoverso-TomoMusic/1.0', '-e', 'https://ccmixter.org/', '-o', tmp, directUrl,
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
    ['#05090d', '#15352d', '#d8a84d'], ['#081019', '#172d4a', '#f0c875'],
    ['#090712', '#39264f', '#c9984b'], ['#06100f', '#0f4a3d', '#e2b75d'],
    ['#100b08', '#402f1a', '#f2c16d'], ['#050815', '#23405f', '#93c5fd'],
    ['#0b080d', '#45283a', '#f3a6c8'], ['#070b10', '#243042', '#b0d8d8'],
  ];
  const [a, b, c] = palettes[idx % palettes.length];
  const title = String(track.title || 'TomoMusic').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const artist = String(track.artist || 'Creative Commons').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <defs>
    <radialGradient id="g" cx="32%" cy="20%" r="82%"><stop stop-color="${b}"/><stop offset="1" stop-color="${a}"/></radialGradient>
    <linearGradient id="gold" x1="0" x2="1"><stop stop-color="${c}"/><stop offset="1" stop-color="#fff1b8"/></linearGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer></filter>
  </defs>
  <rect width="900" height="900" fill="url(#g)"/>
  <rect width="900" height="900" filter="url(#grain)" opacity=".35"/>
  <circle cx="720" cy="150" r="105" fill="url(#gold)" opacity=".16"/>
  <circle cx="170" cy="700" r="230" fill="${c}" opacity=".08"/>
  <path d="M110 610c100-95 205-117 316-42 75 51 142 48 215-10 58-46 110-56 159-29v141H110z" fill="#ffffff" opacity=".06"/>
  <path d="M185 288c88-57 176-57 264 0s176 57 264 0" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" opacity=".22"/>
  <path d="M170 350h560" stroke="#fff" stroke-width="1" opacity=".07"/>
  <text x="78" y="108" fill="${c}" font-family="Georgia,serif" font-size="30" letter-spacing="8">TOMOMUSIC</text>
  <text x="78" y="728" fill="#fff8e8" font-family="Inter,Arial,sans-serif" font-size="50" font-weight="800">${title.slice(0, 26)}</text>
  <text x="78" y="784" fill="#d5c8a6" font-family="Inter,Arial,sans-serif" font-size="28">${artist.slice(0, 38)}</text>
  <text x="78" y="834" fill="${c}" font-family="Inter,Arial,sans-serif" font-size="18" letter-spacing="3">ROYALTY-FREE • CREATIVE COMMONS</text>
</svg>`;
}

function classifyMood(term, item) {
  const blob = `${term} ${item.upload_name || ''} ${item.upload_tags || ''}`.toLowerCase();
  if (/(rain|storm|water|river)/.test(blob)) return 'rain';
  if (/(sleep|night|dream|dreamy|quiet|peaceful|meditation|relax)/.test(blob)) return 'sleep';
  if (/(fantasy|cinematic|story|winter|magic|atmospheric|soundscape)/.test(blob)) return 'fantasy';
  if (/(jazz|smooth|lounge|coffee)/.test(blob)) return 'jazz lofi';
  if (/(ambient|soundscape|atmospheric|meditation)/.test(blob)) return 'ambient';
  if (/(piano|acoustic|soft|romance|mellow|melancholy)/.test(blob)) return 'chill';
  if (/(study|focus|beat|lofi|downtempo|electronic)/.test(blob)) return 'lofi';
  return 'reading';
}

function classifyGenre(item, mood) {
  const blob = `${item.upload_tags || ''} ${item.upload_name || ''}`.toLowerCase();
  if (blob.includes('jazz') || mood === 'jazz lofi') return 'jazz lofi';
  if (blob.includes('piano')) return 'piano calmo';
  if (blob.includes('ambient') || mood === 'ambient') return 'ambient';
  if (blob.includes('electronic') || blob.includes('beat') || mood === 'lofi') return 'lofi / study beats';
  if (mood === 'fantasy') return 'fantasy calm';
  if (mood === 'rain') return 'rain / reading music';
  return 'música ambiente';
}

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tomomusic_tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      mood TEXT NOT NULL DEFAULT 'reading',
      genre TEXT NOT NULL DEFAULT 'ambient',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      file_url TEXT NOT NULL,
      cover_url TEXT,
      source_url TEXT NOT NULL,
      license_name TEXT NOT NULL,
      license_url TEXT NOT NULL,
      attribution_required INTEGER NOT NULL DEFAULT 0,
      attribution_text TEXT NOT NULL DEFAULT '',
      source TEXT,
      downloaded_at TEXT,
      local_file TEXT,
      bytes INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      play_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tomomusic_playlists (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      mood TEXT NOT NULL DEFAULT 'reading',
      cover_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tomomusic_playlist_tracks (
      playlist_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (playlist_id, track_id)
    );
    CREATE TABLE IF NOT EXISTS tomomusic_likes (
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (track_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tomomusic_favorites (
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (track_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tomomusic_plays (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL,
      user_id TEXT,
      session_id TEXT,
      seconds_listened INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function rebuildPlaylists(db) {
  const playlists = [
    { slug: 'leitura-calma', title: 'Leitura calma', mood: 'reading', description: 'Faixas tranquilas para ler sem competir com a história.' },
    { slug: 'lofi-para-novels', title: 'Lofi para novels', mood: 'lofi', description: 'Batidas leves e atmosfera noturna para capítulos longos.' },
    { slug: 'fantasia-tranquila', title: 'Fantasia tranquila', mood: 'fantasy', description: 'Texturas suaves para mundos mágicos, aventura e contemplação.' },
    { slug: 'romance-suave', title: 'Romance suave', mood: 'chill', description: 'Clima quente, lento e acolhedor para cenas emocionais.' },
    { slug: 'noite-de-leitura', title: 'Noite de leitura', mood: 'sleep', description: 'Som escuro e confortável para ler de madrugada.' },
    { slug: 'chuva-e-paginas', title: 'Chuva e páginas', mood: 'rain', description: 'Ambiência de chuva, janela aberta e páginas virando.' },
    { slug: 'foco-total', title: 'Foco total', mood: 'ambient', description: 'Loop limpo para estudo, escrita e leitura concentrada.' },
  ];
  const active = db.prepare('SELECT id, mood, cover_url, play_count, created_at FROM tomomusic_tracks WHERE is_active = 1 ORDER BY play_count DESC, created_at DESC, title ASC').all();
  const allIds = active.map((t) => t.id);
  const insertPlaylist = db.prepare(`
    INSERT INTO tomomusic_playlists (id, slug, title, description, mood, cover_url, sort_order, is_system, is_active, updated_at)
    VALUES (@id, @slug, @title, @description, @mood, @cover_url, @sort_order, 1, 1, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET title=excluded.title, description=excluded.description, mood=excluded.mood, cover_url=excluded.cover_url, sort_order=excluded.sort_order, is_active=1, updated_at=datetime('now')
  `);
  const clear = db.prepare('DELETE FROM tomomusic_playlist_tracks WHERE playlist_id = ?');
  const add = db.prepare('INSERT OR IGNORE INTO tomomusic_playlist_tracks (playlist_id, track_id, sort_order) VALUES (?, ?, ?)');
  playlists.forEach((playlist, idx) => {
    const matching = active.filter((t) => t.mood === playlist.mood).map((t) => t.id);
    const trackIds = Array.from(new Set([...matching, ...allIds])).slice(0, Math.min(60, allIds.length));
    const cover = active.find((t) => trackIds.includes(t.id) && t.cover_url)?.cover_url || null;
    const id = `system-${playlist.slug}`;
    insertPlaylist.run({ ...playlist, id, cover_url: cover, sort_order: idx + 1 });
    clear.run(id);
    trackIds.forEach((trackId, order) => add.run(id, trackId, order + 1));
  });
}

console.log(JSON.stringify({ DB_PATH, STORAGE_ROOT, TARGET_TOTAL, MAX_NEW_DOWNLOADS, MAX_TOTAL_MB: MAX_TOTAL_BYTES / 1024 / 1024 }));
const db = new Database(DB_PATH);
ensureTables(db);

const existingIds = new Set(db.prepare('SELECT id FROM tomomusic_tracks').all().map((r) => r.id));
const existingCount = Number(db.prepare('SELECT COUNT(*) AS c FROM tomomusic_tracks WHERE is_active = 1').get().c || 0);
const existingBytes = Number(db.prepare('SELECT COALESCE(SUM(bytes), 0) AS c FROM tomomusic_tracks WHERE is_active = 1').get().c || 0);
const needed = Math.max(0, TARGET_TOTAL - existingCount);
const maxDownloads = Math.min(MAX_NEW_DOWNLOADS, needed);
console.log(`Existing active tracks: ${existingCount}. Need: ${needed}. Max downloads now: ${maxDownloads}. Existing bytes ${(existingBytes / 1024 / 1024).toFixed(1)}MB`);

if (maxDownloads === 0) {
  rebuildPlaylists(db);
  console.log('Target already reached. Playlists rebuilt.');
  process.exit(0);
}

const seen = new Set(existingIds);
const candidates = [];
const candidateLimit = Number(process.env.TOMOMUSIC_MAX_CANDIDATES || Math.max(maxDownloads * 4, 240));
outer: for (const term of TERMS) {
  for (let page = 0; page < PAGES_PER_TERM; page += 1) {
    const offset = page * PAGE_LIMIT;
    process.stdout.write(`Query ${term} offset ${offset}... `);
    let rows = [];
    try { rows = await queryTerm(term, offset); } catch (e) { console.warn(`failed: ${e.message}`); continue; }
    console.log(`${rows.length}`);
    for (const item of rows) {
      const id = `ccmixter-${item.upload_id}`;
      if (!item.upload_id || seen.has(id)) continue;
      if (!hasClearCommercialSafeLicense(item)) continue;
      if (!isReadingFriendly(item)) continue;
      const file = (item.files || []).find((f) => {
        const name = String(f.file_name || '').toLowerCase();
        const mime = String(f.file_format_info?.mime_type || '').toLowerCase();
        const size = Number(f.file_rawsize || 0);
        return name.endsWith('.mp3') && mime.includes('audio') && size > 700000 && size <= MAX_PER_TRACK_BYTES && f.download_url;
      });
      if (!file?.download_url) continue;
      const duration = durationToSeconds(file.file_format_info?.ps);
      if (duration < MIN_DURATION || duration > MAX_DURATION) continue;
      seen.add(id);
      const size = Number(file.file_rawsize || 0);
      const mood = classifyMood(term, item);
      candidates.push({ id, item, file, term, mood, duration, size });
      if (candidates.length >= candidateLimit) {
        console.log(`Candidate limit reached: ${candidates.length}`);
        break outer;
      }
    }
  }
}

candidates.sort((a, b) => {
  const score = (c) => {
    const tags = String(c.item.upload_tags || '').toLowerCase();
    let s = 0;
    if (tags.includes('editorial_pick')) s += 40;
    if (/(ambient|piano|jazz|chill|lofi|downtempo|instrumental|soundscape)/.test(tags)) s += 22;
    if (/(sample|remix|media)/.test(tags)) s += 4;
    if (c.duration >= 150 && c.duration <= 600) s += 12;
    if (c.size <= 12 * 1024 * 1024) s += 8;
    return s;
  };
  return score(b) - score(a) || a.size - b.size || a.item.upload_name.localeCompare(b.item.upload_name);
});

let plannedBytes = existingBytes;
const selected = [];
for (const c of candidates) {
  if (selected.length >= maxDownloads) break;
  if (plannedBytes + c.size > MAX_TOTAL_BYTES) continue;
  plannedBytes += c.size;
  selected.push(c);
}
console.log(`Safe candidates: ${candidates.length}. Selected: ${selected.length}. Planned total ${(plannedBytes / 1024 / 1024).toFixed(1)}MB`);

const insertTrack = db.prepare(`
  INSERT INTO tomomusic_tracks (
    id, title, artist, description, mood, genre, duration_seconds, file_url, cover_url,
    source_url, license_name, license_url, attribution_required, attribution_text,
    source, downloaded_at, local_file, bytes, is_active, created_at, updated_at
  ) VALUES (
    @id, @title, @artist, @description, @mood, @genre, @duration_seconds, @file_url, @cover_url,
    @source_url, @license_name, @license_url, @attribution_required, @attribution_text,
    @source, @downloaded_at, @local_file, @bytes, 1, datetime('now'), datetime('now')
  )
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title,
    artist=excluded.artist,
    description=excluded.description,
    mood=excluded.mood,
    genre=excluded.genre,
    duration_seconds=excluded.duration_seconds,
    file_url=excluded.file_url,
    cover_url=excluded.cover_url,
    source_url=excluded.source_url,
    license_name=excluded.license_name,
    license_url=excluded.license_url,
    attribution_required=excluded.attribution_required,
    attribution_text=excluded.attribution_text,
    source=excluded.source,
    downloaded_at=excluded.downloaded_at,
    local_file=excluded.local_file,
    bytes=excluded.bytes,
    is_active=1,
    updated_at=datetime('now')
`);

const downloaded = [];
let idx = existingCount;
for (const c of selected) {
  idx += 1;
  const item = c.item;
  const artist = item.user_real_name || item.user_name || 'ccMixter';
  const base = `${String(idx).padStart(3, '0')}-${slugify(item.upload_name)}-${slugify(artist)}`;
  const fileName = `${base}.mp3`;
  const coverName = `${base}.svg`;
  const dest = path.join(TRACK_DIR, fileName);
  if (!fs.existsSync(dest) || fs.statSync(dest).size < Math.max(100000, c.size * 0.94)) {
    console.log(`Downloading ${downloaded.length + 1}/${selected.length}: ${item.upload_name} — ${artist} (${(c.size / 1024 / 1024).toFixed(1)}MB)`);
    try { download(c.file.download_url, dest); } catch (e) { console.warn(`Download failed, skipping ${item.upload_name}: ${e.message}`); continue; }
  }
  const actualBytes = fs.statSync(dest).size;
  const coverPath = path.join(COVER_DIR, coverName);
  if (!fs.existsSync(coverPath)) fs.writeFileSync(coverPath, coverSvg({ title: item.upload_name, artist }, idx));
  const mood = c.mood;
  const genre = classifyGenre(item, mood);
  const tags = String(item.upload_tags || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12).join(', ');
  const track = {
    id: c.id,
    title: String(item.upload_name || 'Faixa Creative Commons').slice(0, 180),
    artist: String(artist).slice(0, 180),
    description: `Faixa Creative Commons adicionada ao TomoMusic para leitura ambiente. Tags: ${tags}`,
    mood,
    genre,
    duration_seconds: c.duration,
    file_url: `${PUBLIC_BASE}/tracks/${fileName}`,
    cover_url: `${PUBLIC_BASE}/covers/${coverName}`,
    source_url: item.file_page_url || `https://ccmixter.org/files/${item.user_name || ''}/${item.upload_id}`,
    license_name: item.license_name,
    license_url: item.license_url,
    attribution_required: 1,
    attribution_text: `${item.upload_name} — ${artist} (${item.license_name}). Fonte: ${item.file_page_url}. Licença: ${item.license_url}`,
    source: 'ccMixter',
    downloaded_at: new Date().toISOString(),
    local_file: path.relative(ROOT, dest).replace(/\\/g, '/'),
    bytes: actualBytes,
  };
  insertTrack.run(track);
  downloaded.push(track);
}

rebuildPlaylists(db);
const finalStats = db.prepare(`SELECT COUNT(*) AS tracks, COALESCE(SUM(bytes), 0) AS bytes, COALESCE(SUM(duration_seconds), 0) AS seconds, SUM(CASE WHEN attribution_required=1 THEN 1 ELSE 0 END) AS credits FROM tomomusic_tracks WHERE is_active = 1`).get();
const licenseStats = db.prepare(`SELECT license_name, license_url, COUNT(*) AS tracks FROM tomomusic_tracks WHERE is_active = 1 GROUP BY license_name, license_url ORDER BY tracks DESC`).all();
const moodStats = db.prepare(`SELECT mood, COUNT(*) AS tracks FROM tomomusic_tracks WHERE is_active = 1 GROUP BY mood ORDER BY tracks DESC`).all();
console.log(JSON.stringify({
  addedThisRun: downloaded.length,
  finalStats,
  licenseStats,
  moodStats,
  storageRoot: STORAGE_ROOT,
  publicBase: PUBLIC_BASE,
}, null, 2));
