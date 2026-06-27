const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = process.cwd();
const catalogPath = path.join(ROOT, 'data/catalog/tomoverso-original-books.json');
const books = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const bySlug = new Map(books.map((b) => [b.slug, b]));

const targets = [
  'quando-o-chefe-final-virou-meu-colega-de-classe',
  'playlist-para-fugir-de-voce',
  'garotos-que-brilham-no-escuro',
  'cafe-as-23h59',
  'o-ultimo-trem-para-aurora',
  'o-garoto-que-vendia-finais-felizes',
  'a-maldicao-do-segundo-protagonista',
  'a-princesa-do-apartamento-404',
  'anjos-de-jaqueta-preta',
  'o-castelo-no-fundo-do-shopping',
  'meu-guarda-costas-e-um-cupido-demitido',
  'beijos-feiticos-e-wi-fi-ruim',
  'o-garoto-da-janela-17',
  'os-mortos-tambem-dao-match',
];

const custom = {
  'quando-o-chefe-final-virou-meu-colega-de-classe': 'dynamic anime light novel cover: ordinary Brazilian high school classroom torn open by a pixel magic portal on the blackboard; nervous gamer boy in school uniform holding a handheld console in foreground; beside him a beautiful intimidating demon king transfer student with subtle horns, red glowing eyes, blazer uniform, black aura and fragments of fantasy armor under the jacket; floating desks, RPG UI shards, classmates blurred in shock; comedic fantasy school energy, green neon and purple magic, strong character poses, deep foreground-middle-background composition',
  'playlist-para-fugir-de-voce': 'emotional young adult anime romance cover: girl with guitar on empty school stage under blue spotlight, boy vocalist with microphone on opposite side, torn sheet music and glowing headphones forming a visual divide between them; rain on auditorium windows, dust in stage light, faces full of regret and unresolved feelings; intimate dramatic composition, pink and blue stage lighting, music festival atmosphere',
  'garotos-que-brilham-no-escuro': 'premium BL school supernatural cover: two rival teenage boys in a dark school corridor after hours, one perfect student in tidy uniform, one rebellious boy with loose tie and jacket; their hands nearly touch and emit contrasting blue and gold light, faces close with tense vulnerable expressions, rain on windows, lockers, reflected glow on floor; romantic but non-sexual, emotional, cinematic, not generic sci-fi',
  'cafe-as-23h59': 'cozy magical slice of life romance book cover: young barista behind a warm late night cafe counter, wall clock clearly at 23:59, mysterious boy with umbrella framed in rainy glass door, steam from coffee cup forming tiny stars, warm amber interior vs deep blue rainy street, shelves of pastries and handwritten menu; intimate inviting professional cover composition',
  'o-ultimo-trem-para-aurora': 'book cover vertical 2:3, NOT a train landscape: large emotional foreground characters first. A teenage boy on the left platform and a teenage girl on the right platform reach toward each other across a glowing old night train, their faces visible and expressive, hands almost touching through mist; the train is midground, aurora green-pink sky is background, wet rails reflect both characters, silhouettes of alternate lives inside train windows; cinematic depth, romance mystery, professional anime light novel cover',
  'o-garoto-que-vendia-finais-felizes': 'fantasy urban romance cover: narrow magical shop in rainy alley, young male seller behind counter holding a golden vial containing a tiny floating happy ending scene; girl customer reaches for it with tears and hope; shelves packed with glowing vials, clocks, memory fragments, amber magic light spilling into blue night; mysterious premium web novel composition',
  'a-maldicao-do-segundo-protagonista': 'meta BL romantic comedy anime cover: charming second male lead holding a script labeled with broken manga panels around him, rival boy leaning in with teasing smile, dramatic stage spotlight, shattered comic frames, pink/yellow hearts and arrows crossing the composition; playful but polished, expressive faces, strong pose, romantic tension, not a flat school portrait',
  'a-princesa-do-apartamento-404': 'comedy fantasy isekai reverse cover: armored warrior princess with red cape sitting on messy apartment couch holding a TV remote like a sword, portal glowing in living room wall behind her, confused freelancer boy with laptop and coffee beside her, pizza boxes, magic runes, city window; funny high energy, clear apartment 404 identity, bright professional light novel cover',
  'anjos-de-jaqueta-preta': 'urban supernatural action anime cover: five young antihero angels in black jackets standing on rainy rooftop, translucent golden wings partly visible behind them, city skyline below, protagonist holding glowing feather dissolving into memory fragments, dramatic low angle, streetlight reflections, moody blue-black-gold palette, strong group identity, not dark faceless silhouettes',
  'o-castelo-no-fundo-do-shopping': 'fantasy urban adventure cover: three teenagers pushing aside a fitting room curtain in an abandoned shopping mall store, revealing a full magical castle kingdom behind the mirror; half modern mall with escalator and neon sale signs, half colorful castle with tiny dragon carrying shopping bags; teenagers in foreground with surprised poses, portal depth, whimsical premium cover',
  'meu-guarda-costas-e-um-cupido-demitido': 'glamorous supernatural romcom action cover: teen actress with sunglasses and stylish jacket on red carpet, annoyed expression, beside her a fallen cupid bodyguard in black suit with small broken glowing wings and cracked light bow, paparazzi flashes, feathers, heart arrows missing targets, shadowy heart-hunting creature in background; cinematic, funny, clearly cupid bodyguard',
  'beijos-feiticos-e-wi-fi-ruim': 'chaotic magical school comedy cover: four students running through a fantasy academy corridor while broken glowing Wi-Fi symbols, enchanted chat bubbles, hearts and spam monsters explode behind them; girl holding grimoire-tablet, boy casting spell with luminous network cable, portals glitching, bright neon cyan magenta purple; expressive faces, dynamic motion, not generic group photo',
  'o-garoto-da-janela-17': 'book cover vertical 2:3, romantic mystery, large clear foreground: girl inside dark bedroom at rain-covered window on left, her face visible in profile, hand touching glass; across the street a glowing apartment window number 17 contains a clearly visible ghostly boy writing a message on the glass, warm yellow window against blue city night; reflections of both faces in raindrops, clock glow 22:17, cinematic suspense, professional anime cover, not just a dark silhouette',
  'os-mortos-tambem-dao-match': 'supernatural romcom anime cover: girl in cozy cafe holding phone showing abstract glowing match heart (no readable app text), transparent ghost boy floating behind chair with charming smile, objects levitating, tiny translucent hearts and blue spectral glow, warm coffee shop lights, funny romantic expression, clearly ghost dating app concept, premium web novel cover',
};

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
      <stop offset="30%" stop-color="#000" stop-opacity="0.74"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.97"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.86"/></filter>
  </defs>
  <rect x="0" y="560" width="600" height="340" fill="url(#fade)"/>
  <g filter="url(#shadow)">
    <text x="300" y="630" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="900" letter-spacing="4" fill="#fff" opacity="0.78">TOMOVERSO ORIGINAL</text>
    ${lines.map((line, i) => `<text x="300" y="${startY + i * gap}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="900" fill="#fff">${esc(line)}</text>`).join('\n')}
    <text x="300" y="858" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="900" letter-spacing="2.2" fill="#fff" opacity="0.74">${esc(book.mainGenre.toUpperCase())}</text>
  </g>
</svg>`);
}

async function download(url, attempts = 2) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 TomoversoCoverBot/2.0' }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      const buf = Buffer.from(await res.arrayBuffer());
      if (!type.startsWith('image/') || buf.length < 25000) throw new Error(`bad image response type=${type} bytes=${buf.length}`);
      return buf;
    } catch (err) {
      last = err;
      await sleep(1800 * (i + 1));
    }
  }
  throw last;
}

function buildPrompt(book, variant) {
  const base = custom[book.slug] || book.coverIdea;
  const style = variant % 2 === 0
    ? 'high detail anime light novel premium book cover, cinematic backlight, professional publishing cover, sharp focus, rich foreground middle ground background, strong silhouette, expressive pose'
    : 'semi-anime digital painting young adult web novel cover, dramatic vertical composition, premium poster art, elegant lighting, detailed clothes, emotional facial expression, strong focal point';
  return [
    base,
    style,
    'STRICT vertical 2:3 book cover composition from the beginning, tall portrait layout, no square image, no horizontal banner, no stretched anatomy, no squeezed face, no compressed body.',
    'Original characters only. No existing franchise characters. No readable text, no title, no logo, no watermark, no signature. Leave lower area slightly darker/clean for typography overlay.'
  ].join(' ');
}

async function generateCandidate(book, variant, dir) {
  const seed = (hash(book.slug) + variant * 9419 + 50000) % 999999;
  const prompt = buildPrompt(book, variant);
  const urls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1152&model=flux&nologo=true&private=true&seed=${seed}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1152&nologo=true&private=true&seed=${seed + 3}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=1152&model=turbo&nologo=true&private=true&seed=${seed + 7}`,
  ];
  let raw, err;
  for (const url of urls) {
    try { raw = await download(url, 1); break; }
    catch (e) { err = e; }
  }
  if (!raw) throw err || new Error('image failed');
  const base = await sharp(raw)
    .resize(600, 900, { fit: 'cover', position: 'attention', withoutEnlargement: false })
    .modulate({ saturation: 1.08, brightness: 1.01 })
    .webp({ quality: 94, effort: 5 })
    .toBuffer();
  const out = path.join(dir, `${book.slug}-cand${variant}.webp`);
  await sharp(base)
    .composite([{ input: titleOverlay(book), left: 0, top: 0 }])
    .webp({ quality: 94, effort: 5 })
    .toFile(out);
  return out;
}

async function mapLimit(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const dir = path.join(ROOT, 'tmp/weak-cover-regens');
  // Resume-safe: keep already generated candidates.
  fs.mkdirSync(dir, { recursive: true });
  const chosenTargets = process.env.REGEN_SLUGS ? process.env.REGEN_SLUGS.split(',').map(s => s.trim()).filter(Boolean) : targets;
  const forcedVariants = process.env.REGEN_VARIANTS ? process.env.REGEN_VARIANTS.split(',').map(Number).filter(Boolean) : null;
  const force = process.env.REGEN_FORCE === '1';
  const jobs = [];
  const existing = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.webp')) : [];
  for (const slug of chosenTargets) {
    const book = bySlug.get(slug);
    if (!book) throw new Error(`Missing book ${slug}`);
    const variants = forcedVariants || [1];
    for (const variant of variants) {
      const file = `${slug}-cand${variant}.webp`;
      const hasCandidate = existing.includes(file) || existing.some((f) => f.startsWith(`${slug}-cand`));
      if (force || !hasCandidate) jobs.push({ book, variant });
    }
  }
  const failures = [];
  await mapLimit(jobs, 1, async ({ book, variant }) => {
    await sleep(18000);
    process.stdout.write(`${book.slug} cand${variant} ... `);
    try {
      await generateCandidate(book, variant, dir);
      console.log('ok');
    } catch (e) {
      console.log('FAIL', e.message);
      failures.push({ slug: book.slug, variant, error: e.message });
    }
  });
  console.log(JSON.stringify({ targetCount: targets.length, candidateCount: fs.readdirSync(dir).filter(f=>f.endsWith('.webp')).length, failures }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
