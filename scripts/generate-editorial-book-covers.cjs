#!/usr/bin/env node
/* Generate premium editorial book covers for Tomoverso Originals. No generic AI art. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || '/var/www/tomoverso/data-runtime/tomoverso.db';
const BACKUP_DIR = process.env.BACKUP_DIR || '/var/www/tomoverso/backups';
const OUT_DIR = process.env.OUT_DIR || path.join(process.cwd(), 'public', 'uploads', 'books', 'editorial-covers');
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), 'docs', 'capas-editoriais-livros-tomoverso.md');
const WIDTH = 600;
const HEIGHT = 900;

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hashText(str) {
  let h = 2166136261;
  for (const ch of String(str || '')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function safeArray(raw) {
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v.filter(Boolean) : []; } catch { return []; }
}

function wrapTitle(title, max = 16) {
  const words = String(title || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  if (lines.length <= 5) return lines;
  return [...lines.slice(0, 4), lines.slice(4).join(' ')];
}

function paletteFor(book, index) {
  const text = `${book.title} ${book.genres}`.toLowerCase();
  const palettes = [
    { name:'noir neon', bg1:'#120814', bg2:'#321144', bg3:'#f973c8', accent:'#f8d56b', ink:'#fff8e7' },
    { name:'royal blue', bg1:'#07111f', bg2:'#123c69', bg3:'#41d4ff', accent:'#ffe08a', ink:'#f7fbff' },
    { name:'crimson gold', bg1:'#170606', bg2:'#511515', bg3:'#ef4444', accent:'#f6c453', ink:'#fff7ed' },
    { name:'emerald dusk', bg1:'#05140f', bg2:'#0f5132', bg3:'#34d399', accent:'#e8ff9a', ink:'#f2fff9' },
    { name:'violet moon', bg1:'#100720', bg2:'#39206b', bg3:'#a78bfa', accent:'#f0abfc', ink:'#fbf7ff' },
    { name:'amber dusk', bg1:'#171006', bg2:'#713f12', bg3:'#f59e0b', accent:'#fde68a', ink:'#fff7ed' },
    { name:'ice rose', bg1:'#071019', bg2:'#27435f', bg3:'#93c5fd', accent:'#f9a8d4', ink:'#f8fbff' },
    { name:'teal noir', bg1:'#031715', bg2:'#0f766e', bg3:'#2dd4bf', accent:'#fde68a', ink:'#effffb' },
  ];
  if (/romance|beijo|namor|coraç|amor|fofa|idol/.test(text)) return palettes[(index + 0) % palettes.length];
  if (/fantasia|bruxa|drag|reino|coroa|princes|magia|castelo/.test(text)) return palettes[(index + 4) % palettes.length];
  if (/aç[aã]o|anjos|exorcista|morto|fim do mundo|sombras/.test(text)) return palettes[(index + 2) % palettes.length];
  if (/mist[eé]rio|fantasma|espelho|di[aá]rio|mensagem/.test(text)) return palettes[(index + 6) % palettes.length];
  return palettes[(hashText(book.slug) + index) % palettes.length];
}

function kindFor(book) {
  const title = String(book.title || '').toLowerCase();
  const t = `${title} ${book.genres}`.toLowerCase();

  // Prefer title-specific motifs before broad genre words, otherwise everything supernatural becomes a moon.
  if (/biblioteca|livro|papel|rodap[eé]/.test(title)) return 'library';
  if (/flores|rosas/.test(title)) return 'flower';
  if (/fogo|chama/.test(title)) return 'flame';
  if (/espelho/.test(title)) return 'mirror';
  if (/playlist|idol/.test(title)) return 'music';
  if (/chefe final|torneio|guerra|guarda-costas/.test(title)) return 'sword';
  if (/morto|fantasma/.test(title)) return 'ghost';
  if (/finais felizes|di[aá]rio|manual/.test(title)) return 'quill';
  if (/zero|vida extra|app/.test(title)) return 'game';
  if (/anjos|jaqueta|cupido/.test(title)) return 'wings';
  if (/beijo|namor|amor|coraç|match/.test(title)) return 'heart';
  if (/coroa|princes|realeza|rainha|pr[ií]ncipe/.test(title)) return 'crown';
  if (/apartamento|404|shopping|cidade/.test(title)) return 'city';
  if (/telhado|janela/.test(title)) return 'rooftop';
  if (/mensagem/.test(title)) return 'message';
  if (/ver[aã]o|reinicia|tempo|rel[oó]gio|trem/.test(title)) return 'time';
  if (/fim do mundo|estrela|lua|sol|céu|constela|aurora|astronomia/.test(title)) return 'cosmic';
  if (/neve|cinza/.test(title)) return 'snow';
  if (/monstro|drag/.test(title)) return 'beast';
  if (/maldiç|exorcista|sombras/.test(title)) return 'sigil';
  if (/café|23h59|chef|cozinha/.test(title)) return 'cup';
  if (/bruxa|feiti/.test(title)) return 'moon';

  if (/escola|classe|colega|clube/.test(t)) return 'crest';
  if (/sobrenatural|mist[eé]rio/.test(t)) return 'sigil';
  if (/fantasia|magia/.test(t)) return 'emblem';
  return 'emblem';
}

function motif(kind, p, seed) {
  const stroke = p.ink;
  const accent = p.accent;
  const common = `fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"`;
  const accentLine = `fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.88"`;
  const glow = `<circle cx="300" cy="365" r="178" fill="${accent}" opacity="0.08"/>`;
  switch (kind) {
    case 'library': return `${glow}<path ${common} d="M196 260h208v226H196z"/><path ${accentLine} d="M234 292v162M274 292v162M326 292v162M370 292v162"/><path ${common} d="M214 488c42-34 130-34 172 0"/><path fill="${accent}" opacity=".85" d="M300 334l18 36 40 6-29 28 7 40-36-19-36 19 7-40-29-28 40-6z"/>`;
    case 'moon': return `${glow}<path fill="${accent}" opacity=".9" d="M342 217c-56 17-95 69-95 130 0 76 61 137 137 137 29 0 56-9 78-25-17 50-64 86-120 86-70 0-127-57-127-127 0-56 36-103 86-120 12-4 26-6 41-6z"/><path ${common} d="M189 536c63-92 151-139 264-141M245 596c33-42 69-70 108-84"/><circle cx="225" cy="239" r="10" fill="${p.ink}" opacity=".85"/>`;
    case 'crest': return `${glow}<path ${common} d="M300 222l132 52v105c0 85-48 147-132 197-84-50-132-112-132-197V274z"/><path ${accentLine} d="M225 333h150M300 274v238"/><path fill="${accent}" opacity=".86" d="M300 324l22 45 50 7-36 35 9 50-45-24-45 24 9-50-36-35 50-7z"/>`;
    case 'time': return `${glow}<circle ${common} cx="300" cy="380" r="126"/><path ${accentLine} d="M300 286v101l67 41"/><path ${common} d="M218 260c27-24 54-36 82-36s55 12 82 36M216 501c28 24 56 36 84 36s56-12 84-36"/><path ${accentLine} d="M182 380h-42M460 380h-42"/>`;
    case 'beast': return `${glow}<path fill="${accent}" opacity=".15" d="M196 530c9-122 48-203 104-244 56 41 95 122 104 244z"/><path ${common} d="M208 314l49 54M392 314l-49 54M234 508c18-83 40-124 66-124s48 41 66 124"/><circle cx="264" cy="409" r="12" fill="${accent}"/><circle cx="336" cy="409" r="12" fill="${accent}"/><path ${accentLine} d="M272 470c22 17 34 17 56 0"/>`;
    case 'sigil': return `${glow}<circle ${common} cx="300" cy="388" r="132"/><path ${common} d="M300 255v266M185 388h230M224 294l152 188M376 294L224 482"/><path fill="${accent}" opacity=".9" d="M300 336l30 52-30 52-30-52z"/>`;
    case 'cosmic': return `${glow}<circle cx="300" cy="352" r="94" fill="${accent}" opacity=".18"/><circle ${common} cx="300" cy="352" r="84"/><path ${accentLine} d="M164 452c92-84 180-136 272-156M196 545c70-55 139-91 208-108"/><path fill="${p.ink}" opacity=".9" d="M392 236l12 25 28 4-20 19 5 28-25-13-25 13 5-28-20-19 28-4z"/>`;
    case 'city': return `${glow}<path ${common} d="M190 560V290h75v270M265 560V230h70v330M335 560V318h80v242"/><path ${accentLine} d="M215 328h24M215 372h24M215 416h24M290 274h20M290 318h20M290 362h20M363 354h24M363 398h24M363 442h24"/><text x="300" y="506" text-anchor="middle" font-size="52" font-family="Georgia" fill="${accent}" font-weight="700">404</text>`;
    case 'rooftop': return `${glow}<path ${common} d="M150 540h300M190 540l74-118h72l74 118"/><circle cx="246" cy="384" r="28" fill="${p.ink}" opacity=".9"/><circle cx="354" cy="384" r="28" fill="${accent}" opacity=".9"/><path ${accentLine} d="M176 330c85-42 163-42 248 0M210 612h180"/>`;
    case 'message': return `${glow}<rect ${common} x="178" y="268" width="244" height="168" rx="28"/><path ${accentLine} d="M206 314l94 68 94-68"/><path fill="${accent}" opacity=".9" d="M368 438l62 72-93-31z"/><circle cx="242" cy="521" r="12" fill="${p.ink}"/><circle cx="300" cy="521" r="12" fill="${p.ink}"/><circle cx="358" cy="521" r="12" fill="${p.ink}"/>`;
    case 'wings': return `${glow}<path ${common} d="M300 286c-44 82-93 140-164 180 85 6 140-20 164-76 24 56 79 82 164 76-71-40-120-98-164-180z"/><path ${accentLine} d="M222 410c-28 16-56 27-84 31M378 410c28 16 56 27 84 31"/><path fill="${accent}" opacity=".9" d="M300 330l31 62-31 62-31-62z"/>`;
    case 'snow': return `${glow}<path ${common} d="M300 244v268M184 378h232M218 296l164 164M382 296L218 460"/><path ${accentLine} d="M300 244l-28 34M300 244l28 34M300 512l-28-34M300 512l28-34M184 378l34-28M184 378l34 28M416 378l-34-28M416 378l-34 28"/>`;
    case 'crown': return `${glow}<path fill="${accent}" opacity=".88" d="M170 470l34-156 76 88 20-146 20 146 76-88 34 156z"/><path ${common} d="M170 470h260v78H170z"/><circle cx="204" cy="314" r="16" fill="${p.ink}"/><circle cx="300" cy="256" r="16" fill="${p.ink}"/><circle cx="396" cy="314" r="16" fill="${p.ink}"/>`;
    case 'cup': return `${glow}<path ${common} d="M218 344h154v94c0 58-35 97-77 97s-77-39-77-97z"/><path ${common} d="M372 374h36c35 0 35 64 0 64h-36"/><path ${accentLine} d="M250 296c-18-28 30-42 12-70M302 296c-18-28 30-42 12-70M354 296c-18-28 30-42 12-70"/><path ${common} d="M196 548h210"/>`;
    case 'heart': return `${glow}<path fill="${accent}" opacity=".86" d="M300 540s-132-76-132-176c0-49 38-86 83-86 27 0 42 12 49 24 7-12 22-24 49-24 45 0 83 37 83 86 0 100-132 176-132 176z"/><path ${common} d="M220 390h58l24-54 33 110 28-56h45"/>`;
    case 'flower': return `${glow}<circle cx="300" cy="390" r="34" fill="${accent}" opacity=".9"/><path ${common} d="M300 356c-44-66-102-57-112-9-10 48 49 71 112 43 63 28 122 5 112-43-10-48-68-57-112 9zM300 424c-44 66-102 57-112 9-10-48 49-71 112-43 63-28 122-5 112 43-10 48-68 57-112-9z"/><path ${accentLine} d="M300 424v126M266 508c22-28 46-41 72-39"/>`;
    case 'flame': return `${glow}<path fill="${accent}" opacity=".88" d="M306 548c-82-31-116-92-87-158 18-41 55-57 62-117 42 43 76 79 71 137 26-20 41-50 41-82 71 87 48 183-87 220z"/><path ${common} d="M302 508c-35-33-42-72-13-119 24 32 45 50 37 91 20-10 34-28 42-55 29 44 7 82-66 83z"/>`;
    case 'mirror': return `${glow}<rect ${common} x="214" y="248" width="172" height="244" rx="42"/><path ${accentLine} d="M250 294c46 34 102 34 146 0M244 542h112M268 492v50M332 492v50"/><path fill="${accent}" opacity=".2" d="M244 286h112v168H244z"/>`;
    case 'music': return `${glow}<path ${common} d="M246 296v178c0 32-27 58-60 58s-60-26-60-58 27-58 60-58c16 0 30 5 42 14V272l198-42v178c0 32-27 58-60 58s-60-26-60-58 27-58 60-58c16 0 30 5 42 14V254z"/><path ${accentLine} d="M246 334l180-38"/>`;
    case 'sword': return `${glow}<path fill="${accent}" opacity=".78" d="M300 226l38 208-38 116-38-116z"/><path ${common} d="M300 226v324M218 444h164M244 496l-42 72M356 496l42 72"/><path ${accentLine} d="M250 314l100 128"/>`;
    case 'ghost': return `${glow}<path fill="${accent}" opacity=".23" d="M202 548V360c0-76 44-128 98-128s98 52 98 128v188l-34-30-32 30-32-30-32 30-32-30z"/><path ${common} d="M202 548V360c0-76 44-128 98-128s98 52 98 128v188l-34-30-32 30-32-30-32 30-32-30z"/><circle cx="264" cy="363" r="12" fill="${p.ink}"/><circle cx="336" cy="363" r="12" fill="${p.ink}"/><path ${accentLine} d="M272 430c22 14 34 14 56 0"/>`;
    case 'quill': return `${glow}<path fill="${accent}" opacity=".82" d="M408 228c-124 20-196 88-218 204l74-44-38 90 88-56c69-35 104-100 94-194z"/><path ${common} d="M208 538c56-109 119-189 200-310M192 586h216"/><path ${accentLine} d="M248 429l86-11M284 367l78-8"/>`;
    case 'game': return `${glow}<rect ${common} x="176" y="312" width="248" height="148" rx="52"/><path ${accentLine} d="M232 386h70M267 351v70"/><circle cx="354" cy="371" r="13" fill="${accent}"/><circle cx="390" cy="407" r="13" fill="${p.ink}"/><text x="300" y="548" text-anchor="middle" font-size="54" font-family="Georgia" fill="${accent}" font-weight="800">1UP</text>`;
    default: return `${glow}<path ${common} d="M300 230l132 76v152L300 534l-132-76V306z"/><path ${accentLine} d="M300 230v304M168 306l132 76 132-76M168 458l132-76 132 76"/><circle cx="300" cy="382" r="42" fill="${accent}" opacity=".85"/>`;
  }
}

function titleSvg(lines, palette) {
  const fontSize = lines.length <= 2 ? 46 : lines.length === 3 ? 40 : 34;
  const lineHeight = Math.round(fontSize * 1.03);
  const startY = 642 - Math.max(0, lines.length - 3) * 10;
  return lines.map((line, i) => `
    <text x="300" y="${startY + i * lineHeight}" text-anchor="middle"
      font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="800"
      letter-spacing="${line.length < 9 ? 1.5 : .4}" fill="${palette.ink}">${escapeXml(line.toUpperCase())}</text>`).join('\n');
}

function decorativePattern(seed, palette) {
  const pieces = [];
  for (let i = 0; i < 46; i += 1) {
    const x = 34 + ((seed * (i + 7) + i * 61) % 532);
    const y = 36 + ((seed * (i + 11) + i * 89) % 806);
    const r = 1 + ((seed + i * 13) % 4);
    const op = 0.08 + (((seed + i * 17) % 20) / 100);
    pieces.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 3 === 0 ? palette.accent : palette.ink}" opacity="${op.toFixed(2)}"/>`);
  }
  for (let i = 0; i < 10; i += 1) {
    const y = 90 + i * 67;
    pieces.push(`<path d="M${70 + (i % 2) * 18} ${y} C 190 ${y - 34}, 410 ${y + 34}, ${530 - (i % 2) * 18} ${y}" stroke="${palette.ink}" stroke-width="1" opacity="0.08" fill="none"/>`);
  }
  return pieces.join('\n');
}

function renderCoverSvg(book, index) {
  const palette = paletteFor(book, index);
  const kind = kindFor(book);
  const seed = hashText(book.slug || book.title);
  const lines = wrapTitle(book.title, 15);
  const rating = /\+18/.test(book.genres || book.synopsis || '') ? '+18' : /\+16/.test(book.genres || book.synopsis || '') ? '+16' : /\+14/.test(book.genres || book.synopsis || '') ? '+14' : 'ORIGINAL';
  const primaryGenre = safeArray(book.genres).find(g => !/^Classificação|conteúdo|consentimento|tensão|violência|romance adulto|todos/.test(g)) || 'Tomo Verso';
  const seriesLabel = rating === 'ORIGINAL' ? 'TOMO VERSO ORIGINAL' : `TOMO VERSO ORIGINAL · ${rating}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg1}"/>
      <stop offset="52%" stop-color="${palette.bg2}"/>
      <stop offset="100%" stop-color="${palette.bg3}"/>
    </linearGradient>
    <radialGradient id="glowA" cx="50%" cy="35%" r="58%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.36"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
      <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.62"/>
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves="2" seed="${seed % 997}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.11"/></feComponentTransfer>
    </filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect width="600" height="900" fill="url(#glowA)"/>
  ${decorativePattern(seed, palette)}
  <rect x="34" y="34" width="532" height="832" rx="32" fill="none" stroke="${palette.ink}" stroke-opacity="0.24" stroke-width="2"/>
  <rect x="48" y="48" width="504" height="804" rx="25" fill="none" stroke="${palette.accent}" stroke-opacity="0.18" stroke-width="1.5"/>
  <g filter="url(#shadow)">
    <circle cx="300" cy="365" r="194" fill="#000" opacity="0.18"/>
    ${motif(kind, palette, seed)}
  </g>
  <rect x="0" y="540" width="600" height="360" fill="#000" opacity="0.32"/>
  <path d="M0 548 C118 504 214 534 300 508 C386 482 484 512 600 470 L600 900 L0 900 Z" fill="#000" opacity="0.44"/>
  <text x="300" y="92" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="3.2" fill="${palette.accent}" opacity="0.95">${escapeXml(seriesLabel)}</text>
  <text x="300" y="124" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="2.4" fill="${palette.ink}" opacity="0.62">${escapeXml(String(primaryGenre).toUpperCase())}</text>
  ${titleSvg(lines, palette)}
  <line x1="150" y1="780" x2="450" y2="780" stroke="${palette.accent}" stroke-width="2" opacity="0.76"/>
  <text x="300" y="818" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="4" fill="${palette.ink}" opacity="0.78">TOMO VERSO EDITORA</text>
  <rect width="600" height="900" fill="url(#vignette)"/>
  <rect width="600" height="900" filter="url(#grain)" opacity="0.65"/>
</svg>`;
}

async function writeCover(book, index) {
  const svg = renderCoverSvg(book, index);
  const out = path.join(OUT_DIR, `${book.slug}.webp`);
  await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).webp({ quality: 94, effort: 5 }).toFile(out);
  const meta = await sharp(out).metadata();
  if (meta.width !== WIDTH || meta.height !== HEIGHT) throw new Error(`bad dimensions for ${book.slug}: ${meta.width}x${meta.height}`);
  return { out, publicPath: `/uploads/books/editorial-covers/${book.slug}.webp`, kind: kindFor(book), palette: paletteFor(book, index).name };
}

async function makeContactSheet(files) {
  const thumbW = 120, thumbH = 180, cols = 10, rows = Math.ceil(files.length / cols);
  const canvas = sharp({ create: { width: cols * thumbW, height: rows * thumbH, channels: 4, background: '#101014' } });
  const composites = [];
  for (let i = 0; i < files.length; i += 1) {
    const input = await sharp(files[i]).resize(thumbW, thumbH, { fit: 'cover' }).webp({ quality: 90 }).toBuffer();
    composites.push({ input, left: (i % cols) * thumbW, top: Math.floor(i / cols) * thumbH });
  }
  const sheet = path.join(OUT_DIR, '_contact-sheet.webp');
  await canvas.composite(composites).webp({ quality: 90 }).toFile(sheet);
  return sheet;
}

function backupDb(dbPath) {
  if (!fs.existsSync(dbPath)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(/:/g, '');
  const backupPath = path.join(BACKUP_DIR, `backup-before-editorial-book-covers-${stamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  try { fs.chmodSync(backupPath, 0o600); } catch {}
  return backupPath;
}

function writeReport(summary) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const md = `# Capas editoriais dos livros Tomoverso

Data: ${new Date().toISOString()}

## Backup

- Backup DB: ${summary.backupPath ? `\`${summary.backupPath}\`` : 'não aplicado'}
- Integrity: **${summary.integrity}**

## Resultado

- Livros processados: **${summary.count}**
- Capas WebP geradas: **${summary.generated}**
- Pasta: \`public/uploads/books/editorial-covers/\`
- Contact sheet: \`${summary.contactSheet}\`

## Direção visual

- Capas editoriais 600×900 WebP.
- Sem rosto/personagem genérico de IA.
- Cada capa usa símbolo central ligado ao título/gênero.
- Tipografia grande e legível, com selo Tomo Verso Original.
- Paleta e textura por obra para evitar aparência de template repetido.

## Amostras de estilos

${summary.styles.map(s => `- ${s.title}: ${s.kind}, paleta ${s.palette}`).join('\n')}
`;
  fs.writeFileSync(REPORT_PATH, md, 'utf8');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const backupPath = backupDb(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  const books = db.prepare(`SELECT id, slug, title, synopsis, genres, cover_url, cover_local_path FROM books WHERE source='Tomoverso Originals' ORDER BY title`).all();
  if (!books.length) throw new Error('No Tomoverso Originals books found');

  const update = db.prepare(`UPDATE books SET cover_local_path=?, cover_url='', updated_at=datetime('now') WHERE id=?`);
  const generated = [];
  const styles = [];
  for (let i = 0; i < books.length; i += 1) {
    const book = books[i];
    const result = await writeCover(book, i);
    update.run(result.publicPath, book.id);
    generated.push(result.out);
    styles.push({ title: book.title, kind: result.kind, palette: result.palette });
  }
  const contactSheet = await makeContactSheet(generated);
  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  const summary = { backupPath, integrity, count: books.length, generated: generated.length, contactSheet, styles: styles.slice(0, 18) };
  writeReport(summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
