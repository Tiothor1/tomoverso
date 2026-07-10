#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const sharp = require('sharp');

const DB_PATH = process.env.DB_PATH || '/var/www/tomoverso/data-runtime/tomoverso.db';
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(process.cwd(), 'public');
const OUT_DIR = process.env.OUT_DIR || path.join(process.cwd(), 'data', 'cover-generation');
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), 'docs', 'auditoria-capas-tomoverso.md');
const TARGETS_PATH = process.env.TARGETS_PATH || path.join(OUT_DIR, 'targets.json');

function safeJsonArray(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function coverOf(row) {
  return row.cover_local_path || row.cover_url || '';
}

function isGenericPath(src) {
  return /\/(ai-covers|editorial-covers|generated|fallback|placeholder|mock|svg-covers)\//i.test(src)
    || /placeholder|generic|fallback|generated/i.test(src);
}

async function localMeta(src) {
  const rel = src.replace(/^\//, '');
  const abs = path.join(PUBLIC_DIR, rel);
  if (!fs.existsSync(abs)) return { exists: false, abs };
  try {
    const meta = await sharp(abs).metadata();
    return { exists: true, abs, width: meta.width || 0, height: meta.height || 0, format: meta.format || '', size: fs.statSync(abs).size };
  } catch (error) {
    return { exists: true, abs, decodeError: String(error.message || error) };
  }
}

async function remoteOk(src) {
  if (!/^https?:\/\//i.test(src)) return null;
  try {
    const res = await fetch(src, { method: 'GET', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0 TomoversoCoverAudit/1.0' } });
    const type = res.headers.get('content-type') || '';
    return { ok: res.ok && /image\//i.test(type), status: res.status, type };
  } catch (error) {
    return { ok: false, status: 0, type: '', error: String(error.message || error) };
  }
}

function baseWork(type, row) {
  return {
    type,
    id: row.id,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis || '',
    genres: safeJsonArray(row.genres),
    tags: safeJsonArray(row.tags),
    source: row.source || '',
    is_original: Number(row.is_original || 0),
    cover_url: row.cover_url || '',
    cover_local_path: row.cover_local_path || '',
    current_cover: coverOf(row),
  };
}

function visibleNovelWhere() {
  return `n.is_approved=1 AND NOT EXISTS(SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)`;
}

async function classify(work) {
  const src = work.current_cover;
  const reasons = [];
  const details = {};
  if (!src) reasons.push('sem_capa');
  if (src && isGenericPath(src)) reasons.push('imagem_generica_ou_template');

  if (src.startsWith('/')) {
    const meta = await localMeta(src);
    details.local = meta;
    if (!meta.exists) reasons.push('capa_quebrada_arquivo_local_inexistente');
    if (meta.decodeError) reasons.push('capa_quebrada_decode');
    if (meta.exists && meta.width && meta.height) {
      const ratio = meta.width / meta.height;
      if (meta.width < 600 || meta.height < 900) reasons.push('baixa_resolucao_local');
      if (Math.abs(ratio - 2/3) > 0.05) reasons.push('proporcao_errada_local');
    }
  } else if (/^https?:\/\//i.test(src)) {
    const remote = await remoteOk(src);
    details.remote = remote;
    if (remote && !remote.ok) reasons.push('capa_remota_quebrada');
  }

  // Tomoverso originals must have custom professional art, not no-cover/text fallback.
  if (work.type === 'novel' && (work.source === 'tomoverso-original' || work.is_original)) {
    if (!src) reasons.push('original_tomoverso_sem_identidade_visual');
  }
  if (work.type === 'book' && work.source === 'Tomoverso Originals') {
    if (isGenericPath(src)) reasons.push('livro_original_precisa_capa_ilustrada_profissional');
  }

  return { ...work, reasons: Array.from(new Set(reasons)), details };
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const keys = keyFn(item);
    for (const k of Array.isArray(keys) ? keys : [keys]) out[k] = (out[k] || 0) + 1;
  }
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const db = new Database(DB_PATH, { readonly: true });
  const books = db.prepare(`SELECT id,slug,title,author,synopsis,genres,source,cover_url,cover_local_path,is_hidden FROM books WHERE is_hidden=0 ORDER BY title`).all().map(row => baseWork('book', row));
  const novels = db.prepare(`SELECT n.id,n.slug,n.title,n.synopsis,n.genres,n.tags,n.source,n.is_original,n.cover_url,n.cover_local_path,n.is_approved FROM novels n WHERE ${visibleNovelWhere()} ORDER BY n.title`).all().map(row => baseWork('novel', row));
  db.close();

  const audited = [];
  for (const work of [...books, ...novels]) audited.push(await classify(work));

  const duplicateMap = new Map();
  for (const item of audited) {
    if (!item.current_cover) continue;
    duplicateMap.set(item.current_cover, (duplicateMap.get(item.current_cover) || 0) + 1);
  }
  for (const item of audited) {
    if (item.current_cover && duplicateMap.get(item.current_cover) > 1) item.reasons.push('imagem_duplicada');
    item.reasons = Array.from(new Set(item.reasons));
  }

  const targets = audited.filter(item => item.reasons.length > 0);
  const kept = audited.filter(item => item.reasons.length === 0);
  const summary = {
    generated_at: new Date().toISOString(),
    total_audited: audited.length,
    books_audited: books.length,
    novels_audited: novels.length,
    targets: targets.length,
    kept: kept.length,
    reason_counts: countBy(targets, item => item.reasons),
    target_by_type: countBy(targets, item => item.type),
  };

  fs.writeFileSync(TARGETS_PATH, JSON.stringify({ summary, targets, kept }, null, 2), 'utf8');
  const md = `# Auditoria de capas Tomoverso\n\nData: ${summary.generated_at}\n\n## Resumo\n\n- Obras auditadas: **${summary.total_audited}**\n- Livros auditados: **${summary.books_audited}**\n- Novels/light novels auditadas: **${summary.novels_audited}**\n- Obras com capa adequada mantida: **${summary.kept}**\n- Obras que precisam de geração/substituição: **${summary.targets}**\n\n## Problemas encontrados\n\n${Object.entries(summary.reason_counts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `- ${k}: **${v}**`).join('\n')}\n\n## Alvos por tipo\n\n${Object.entries(summary.target_by_type).map(([k,v]) => `- ${k}: **${v}**`).join('\n')}\n\n## Obras que precisam de capa\n\n${targets.map((item, i) => `${i+1}. **${item.type}** / \`${item.slug}\` — ${item.title}\n   - Problemas: ${item.reasons.join(', ')}\n   - Capa atual: ${item.current_cover || '(nenhuma)'}`).join('\n')}\n\n## Observação\n\nCapas reais/source externas sem erro HTTP foram mantidas por enquanto. Capas locais geradas/template e originals sem imagem entram no lote de geração profissional.\n`;
  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
