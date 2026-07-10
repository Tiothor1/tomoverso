#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || '/var/www/tomoverso/data-runtime/tomoverso.db';
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');
const AUDIT_PATH = process.env.AUDIT_PATH || path.join(process.cwd(), 'data', 'cover-generation', 'targets.json');
const ORIGINAL_DIR = process.env.ORIGINAL_DIR || path.join(PUBLIC_DIR, 'covers', 'generated', 'originals');
const OPT_DIR = process.env.OPT_DIR || path.join(PUBLIC_DIR, 'covers', 'generated', 'optimized');
const BATCH_DIR = process.env.BATCH_DIR || path.join(process.cwd(), 'data', 'cover-generation', 'batches');
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), 'docs', 'geracao-capas-tomoverso.md');
const MODEL = process.env.COVER_MODEL || 'flux';
const API = 'https://image.pollinations.ai/prompt/';
const WIDTH = 1200;
const HEIGHT = 1800;
const CARD_W = 600;
const CARD_H = 900;

function arg(name, def = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  return process.argv.includes(`--${name}`) ? true : def;
}
const BATCH = Number(arg('batch', 1));
const LIMIT = Number(arg('limit', 10));
const FORCE = Boolean(arg('force', false));
const APPLY = Boolean(arg('apply', false));
const ONLY_SLUGS = String(arg('only', '') || '').split(',').map(s => s.trim()).filter(Boolean);

function ensureDirs() {
  for (const dir of [ORIGINAL_DIR, OPT_DIR, BATCH_DIR, path.dirname(REPORT_PATH)]) fs.mkdirSync(dir, { recursive: true });
}
function safeJsonArray(raw) { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v.map(String).filter(Boolean) : []; } catch { return []; } }
function cleanText(text, max = 800) {
  return String(text || '')
    .replace(/Subt[íi]tulo\s*:/gi, 'Subtítulo:')
    .replace(/Sinopse\s*:/gi, 'Sinopse:')
    .replace(/Frase de impacto\s*:[^\.]+\.?/gi, '')
    .replace(/Status\s*:[^\.]+\.?/gi, '')
    .replace(/Tags\s*:[\s\S]+$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
function hashInt(text) { return crypto.createHash('sha256').update(String(text)).digest().readUInt32BE(0); }
function fileBase(item) { return `${item.type}-${item.slug}-cover`; }
function originalPath(item) { return path.join(ORIGINAL_DIR, `${fileBase(item)}-original.webp`); }
function optimizedPath(item) { return path.join(OPT_DIR, `${fileBase(item)}-600x900.webp`); }
function publicOptimizedPath(item) { return `/covers/generated/optimized/${fileBase(item)}-600x900.webp`; }
function publicOriginalPath(item) { return `/covers/generated/originals/${fileBase(item)}-original.webp`; }
function ratingOf(item) {
  const blob = `${item.synopsis || ''} ${item.genres?.join(' ') || ''} ${item.tags?.join(' ') || ''}`;
  if (/\+18|adulto|sensual/i.test(blob)) return '+18';
  if (/\+16/i.test(blob)) return '+16';
  if (/\+14/i.test(blob)) return '+14';
  return 'Livre';
}
function genreBlob(item) { return [...(item.genres || []), ...(item.tags || [])].join(', '); }
function genreKind(item) {
  const t = `${item.title} ${genreBlob(item)} ${item.synopsis}`.toLowerCase();
  if (/romance bl|\bbl\b|dois homens|garoto|rival.*jazz|café preto/i.test(t)) return 'romance bl';
  if (/com[eé]dia rom[âa]ntica|fake|beijo|namor|coraç|romance/i.test(t)) return 'romance';
  if (/fantasia|magia|reino|princes|drag|bruxa|submerso|lua|safira/i.test(t)) return 'fantasia';
  if (/aç[aã]o|guarda|torre|distrito|sirene|lança|drone|batalha/i.test(t)) return 'ação';
  if (/drama|melanc|cartas|promessa|floricultura|ipê/i.test(t)) return 'drama';
  if (/isekai|outro mundo|chefe final|rpg|vil[aã]o|gamer/i.test(t)) return 'isekai';
  return 'light novel brasileira';
}
function motifWords(item) {
  const t = `${item.title} ${genreBlob(item)} ${item.synopsis}`.toLowerCase();
  const motifs = [];
  const map = [
    ['cozinha|chef|panela|molho|café|padaria', 'cozinha acolhedora, xícara, vapor, luz quente'],
    ['floricultura|flores|rosas|ipê|pétala', 'flores marcantes, pétalas no ar, vitrine delicada'],
    ['constela|estrela|lua|céu|aurora|astronomia', 'céu estrelado, constelações, luz azul profunda'],
    ['discos|vinil|jazz|playlist|idol|música', 'loja de discos, vinil, neon discreto, atmosfera musical'],
    ['guarda-chuva|chuva|temporal', 'chuva cinematográfica, guarda-chuva vermelho, reflexos no asfalto'],
    ['relógio|engrenagem|tempo|reinicia|loop', 'relógio antigo, engrenagens, luar, sensação de tempo quebrado'],
    ['cinzas|brasas|vermelha|fogo', 'cinzas azuis, brasas, cidade vermelha, luz dramática'],
    ['torre|muralha|lança|sirene|apagão', 'torre ameaçadora, muralha, poeira, tensão de batalha'],
    ['cartas|bilhetes|jornal|caneta', 'cartas abertas, papel, tinta, mesa de madeira'],
    ['mar|safira|conchas|coral|submerso', 'reino submerso, safira brilhante, coral, água translúcida'],
    ['drag|monstro|fera', 'criatura mágica ao fundo, escala épica, protagonista em destaque'],
    ['shopping|apartamento|404|cidade|neon', 'cidade moderna, janela iluminada, arquitetura urbana'],
    ['espelho|fantasma|morto|sombra', 'espelho antigo, névoa, presença fantasmagórica sutil'],
    ['doce|balas|drones|distrito', 'doces coloridos contrastando com cidade distópica e drones'],
  ];
  for (const [rx, desc] of map) if (new RegExp(rx, 'i').test(t)) motifs.push(desc);
  return motifs.slice(0, 3).join('; ') || 'símbolos visuais retirados do título e da sinopse';
}
function characterSheet(item) {
  const kind = genreKind(item);
  const rating = ratingOf(item);
  const adult = rating === '+18' ? 'Todos os personagens aparentam 23 anos ou mais; romance adulto consensual, sem nudez e sem sexo explícito.' : 'Personagens com idade aparente coerente com a classificação, sem sexualização.';
  if (kind === 'romance bl') return `Dois protagonistas masculinos ${rating === '+18' ? 'adultos' : 'jovens adultos'}, química emocional clara, proximidade respeitosa, roupas urbanas coerentes com o cenário, expressões naturais, ${adult}`;
  if (kind === 'romance') return `Casal protagonista com expressões naturais e emoção clara, roupas coerentes com o cenário, composição elegante e romântica, ${adult}`;
  if (kind === 'fantasia') return `Protagonista em destaque, traje de fantasia original, elemento mágico ligado à obra, postura forte, cenário detalhado, ${adult}`;
  if (kind === 'ação') return `Protagonista em movimento, postura determinada, roupa funcional, iluminação dramática, tensão visual, ${adult}`;
  if (kind === 'isekai') return `Protagonista destacado entre cotidiano e mundo fantástico, contraste visual entre moderno e mágico, sem clichê genérico, ${adult}`;
  return `Protagonista emocionalmente expressivo, postura natural, roupa coerente com a história, atmosfera narrativa clara, ${adult}`;
}
function composition(item) {
  const kind = genreKind(item);
  if (kind === 'romance bl') return 'two-character emotional scene, close but respectful, eye contact or a shared object between them, natural chemistry';
  if (kind === 'romance') return 'romantic two-character scene with soft cinematic light, meaningful distance or touch, environment tied to the story';
  if (kind === 'fantasia') return 'epic fantasy scene, protagonist foreground, magical environment, clear focal point, depth and atmosphere';
  if (kind === 'ação') return 'dynamic action scene, diagonal motion, dramatic lighting, protagonist foreground, readable silhouette';
  if (kind === 'drama') return 'melancholic dramatic scene, controlled colors, expressive face, symbolic environment';
  if (kind === 'isekai') return 'protagonist crossing between mundane object and fantasy world, not generic anime';
  return 'professional cinematic story illustration with strong focal point and unique atmosphere';
}
function promptFor(item) {
  const synopsis = cleanText(item.synopsis, 900);
  const prompt = [
    'Professional premium vertical cinematic story illustration for an original Brazilian web novel.',
    'IMPORTANT: pure full-bleed character/scene illustration only. NOT a poster, NOT a book cover, NOT a magazine page, NOT a graphic design layout. Vertical 2:3 art, 1200x1800, cinematic semi-realistic anime style, polished editorial quality, sharp focus, beautiful composition, high detail, coherent anatomy.',
    'ABSOLUTELY NO WRITING ANYWHERE IN THE IMAGE: no letters, no numbers, no title, no author, no captions, no fake small print, no signage, no poster typography, no watermark, no logo.',
    `Story synopsis context: ${synopsis}.`,
    `Genres and tags: ${genreBlob(item)}.`,
    `Visual motifs: ${motifWords(item)}.`,
    `Character sheet: ${characterSheet(item)}.`,
    `Composition: ${composition(item)}.`,
    'Generate ART ONLY: no title text, no author name, no letters, no typography, no logo, no watermark, no signature.',
    'Avoid: deformed hands, extra fingers, broken anatomy, crossed eyes, melted faces, fused objects, cropped head, generic AI face, random neon overload, unreadable fake text, copied famous cover, watermark.',
  ].join(' ');
  return prompt.replace(/\s+/g, ' ').trim();
}
function shorterPrompt(item) {
  return [
    'Premium professional vertical 2:3 cinematic character/scene illustration. Full-bleed art only, not a poster, not a book cover, not a layout. ABSOLUTELY NO TEXT, no letters, no numbers, no logo, no watermark, no fake typography anywhere.',
    `Story: ${cleanText(item.synopsis, 420)}`,
    `Genres/tags: ${genreBlob(item)}.` ,
    `Motifs: ${motifWords(item)}.` ,
    `${characterSheet(item)} ${composition(item)}.`,
    'Sharp, beautiful, coherent anatomy, original characters only, no deformed hands, no extra fingers, no weird eyes.'
  ].join(' ').replace(/\s+/g, ' ').trim();
}
async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function fetchImage(item, attempt) {
  const seed = hashInt(`${item.type}:${item.slug}:${attempt}`);
  const prompt = attempt < 2 ? promptFor(item) : shorterPrompt(item);
  const model = attempt < 2 ? MODEL : 'turbo';
  const url = `${API}${encodeURIComponent(prompt)}?width=${WIDTH}&height=${HEIGHT}&model=${encodeURIComponent(model)}&nologo=true&private=true&enhance=true&seed=${seed}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(attempt < 2 ? 100000 : 70000), headers: { 'User-Agent': 'Mozilla/5.0 TomoversoCoverGenerator/2.0' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!/image\//i.test(type)) throw new Error(`not image: ${type}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 40_000) throw new Error(`image too small: ${buffer.length}`);
  return { buffer, prompt, seed, model, url };
}
async function qualityCheck(file) {
  const meta = await sharp(file).metadata();
  const stats = await sharp(file).resize(48, 72, { fit: 'cover' }).stats();
  const channels = stats.channels.slice(0,3);
  const stdev = channels.reduce((sum, c) => sum + c.stdev, 0) / Math.max(1, channels.length);
  const mean = channels.reduce((sum, c) => sum + c.mean, 0) / Math.max(1, channels.length);
  const ratio = (meta.width || 0) / Math.max(1, (meta.height || 1));
  const issues = [];
  if (meta.width !== WIDTH || meta.height !== HEIGHT) issues.push(`dimensao_original_${meta.width}x${meta.height}`);
  if (Math.abs(ratio - 2/3) > 0.01) issues.push('proporcao_errada');
  if (fs.statSync(file).size < 80_000) issues.push('arquivo_muito_pequeno');
  if (stdev < 18) issues.push('composicao_plana_baixo_contraste');
  if (mean < 22 || mean > 238) issues.push('exposicao_ruim');
  return { meta, stdev: Number(stdev.toFixed(2)), mean: Number(mean.toFixed(2)), issues };
}
async function generateOne(item) {
  const original = originalPath(item);
  const optimized = optimizedPath(item);
  if (!FORCE && fs.existsSync(original) && fs.existsSync(optimized)) {
    return { item, skipped: true, original, optimized, publicPath: publicOptimizedPath(item), prompt: promptFor(item) };
  }
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      if (attempt > 0) await sleep(4000 + attempt * 3000);
      const generated = await fetchImage(item, attempt);
      await sharp(generated.buffer).resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' }).webp({ quality: 94, effort: 5 }).toFile(original);
      await sharp(original).resize(CARD_W, CARD_H, { fit: 'cover', position: 'attention' }).webp({ quality: 92, effort: 5 }).toFile(optimized);
      const qc = await qualityCheck(original);
      if (qc.issues.length && attempt < 3) { lastError = new Error(qc.issues.join(', ')); continue; }
      return { item, skipped: false, original, optimized, publicPath: publicOptimizedPath(item), publicOriginal: publicOriginalPath(item), prompt: generated.prompt, seed: generated.seed, model: generated.model, qc, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`${item.type}/${item.slug}: ${lastError?.message || lastError}`);
}
function titleLabelSvg(text, w, h) {
  const safe = String(text).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="18" font-family="Arial" font-size="13" fill="#fff">${safe.slice(0, 38)}</text></svg>`);
}
async function makeContactSheet(results, batch) {
  const thumbW = 180, thumbH = 270, labelH = 30, cols = 5, rows = Math.ceil(results.length / cols);
  const sheet = sharp({ create: { width: cols * thumbW, height: rows * (thumbH + labelH), channels: 4, background: '#101014' } });
  const composites = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const x = (i % cols) * thumbW;
    const y = Math.floor(i / cols) * (thumbH + labelH);
    const img = await sharp(r.optimized).resize(thumbW, thumbH, { fit: 'cover' }).webp({ quality: 90 }).toBuffer();
    composites.push({ input: img, left: x, top: y });
    composites.push({ input: titleLabelSvg(`${i + 1}. ${r.item.title}`, thumbW, labelH), left: x, top: y + thumbH });
  }
  const out = path.join(BATCH_DIR, `batch-${String(batch).padStart(2, '0')}-contact-sheet.webp`);
  await sheet.composite(composites).webp({ quality: 92 }).toFile(out);
  return out;
}
function backupDb() {
  const dir = path.join(path.dirname(DB_PATH), '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0,16).replace('T','-').replace(/:/g,'');
  const out = path.join(dir, `backup-before-professional-covers-${stamp}.db`);
  const db = new Database(DB_PATH);
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  fs.copyFileSync(DB_PATH, out);
  try { fs.chmodSync(out, 0o600); } catch {}
  return out;
}
function applyResults(results) {
  const backup = backupDb();
  const db = new Database(DB_PATH);
  const updBook = db.prepare(`UPDATE books SET cover_local_path=?, cover_url='', updated_at=datetime('now') WHERE id=?`);
  const updNovel = db.prepare(`UPDATE novels SET cover_local_path=?, cover_url='', cover_source_url=?, updated_at=datetime('now') WHERE id=?`);
  const tx = db.transaction(() => {
    for (const r of results) {
      if (r.item.type === 'book') updBook.run(r.publicPath, r.item.id);
      else updNovel.run(r.publicPath, r.publicOriginal || r.publicPath, r.item.id);
    }
  });
  tx();
  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  return { backup, integrity };
}
function appendReport(batch, selected, results, errors, applyInfo, contactSheet) {
  const existing = fs.existsSync(REPORT_PATH) ? fs.readFileSync(REPORT_PATH, 'utf8') : `# Geração de capas Tomoverso\n\nModelo/API usada: Pollinations public image endpoint (${MODEL}, fallback turbo) + pós-processamento local com sharp.\n\n`;
  const section = `\n## Lote ${batch} — ${new Date().toISOString()}\n\n- Obras no lote: **${selected.length}**\n- Capas geradas/validadas: **${results.length}**\n- Erros: **${errors.length}**\n- Aplicado no banco: **${APPLY ? 'sim' : 'não'}**\n- Backup: ${applyInfo?.backup ? `\`${applyInfo.backup}\`` : 'n/a'}\n- Integrity: ${applyInfo?.integrity || 'n/a'}\n- Contact sheet: \`${contactSheet}\`\n\n### Obras\n\n${results.map(r => `- **${r.item.type}/${r.item.slug}** — ${r.item.title}\n  - original: \`${r.publicOriginal}\`\n  - card: \`${r.publicPath}\`\n  - modelo: ${r.model || 'skip'} seed ${r.seed || 'n/a'} tentativas ${r.attempts || 0}\n  - prompt: ${r.prompt}`).join('\n')}\n\n${errors.length ? `### Erros\n${errors.map(e => `- ${e}`).join('\n')}\n` : ''}\n`;
  fs.writeFileSync(REPORT_PATH, existing + section, 'utf8');
}
async function main() {
  ensureDirs();
  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  let targets = audit.targets || [];
  if (ONLY_SLUGS.length) targets = targets.filter(t => ONLY_SLUGS.includes(t.slug) || ONLY_SLUGS.includes(`${t.type}/${t.slug}`));
  const start = (BATCH - 1) * LIMIT;
  const selected = ONLY_SLUGS.length ? targets : targets.slice(start, start + LIMIT);
  if (!selected.length) throw new Error(`No targets for batch ${BATCH}`);
  const results = [];
  const errors = [];
  for (const item of selected) {
    try {
      console.log(`GENERATE ${item.type}/${item.slug} ${item.title}`);
      const result = await generateOne(item);
      results.push(result);
      await sleep(18000);
    } catch (error) {
      console.error(`ERROR ${item.type}/${item.slug}:`, error.message || error);
      errors.push(`${item.type}/${item.slug}: ${error.message || error}`);
    }
  }
  const contactSheet = await makeContactSheet(results, BATCH);
  const applyInfo = APPLY && results.length ? applyResults(results) : null;
  appendReport(BATCH, selected, results, errors, applyInfo, contactSheet);
  console.log(JSON.stringify({ batch: BATCH, selected: selected.length, generated: results.length, errors, contactSheet, applied: Boolean(applyInfo), applyInfo }, null, 2));
  if (errors.length) process.exitCode = 2;
}
main().catch(error => { console.error(error); process.exit(1); });
