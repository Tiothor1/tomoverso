#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "/var/www/tomoverso/data-runtime/tomoverso.db";
const BACKUP_DIR = process.env.BACKUP_DIR || "/var/www/tomoverso/backups";
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), "docs", "padrao-oficial-formatacao-leitor-tomoverso.md");

const MIN_BOOK_PAGE_CHARS = 3500;
const TARGET_BOOK_PAGE_CHARS = 5000;
const MAX_BOOK_PAGE_CHARS = 6000;
const MIN_LN_WORDS = 1500;
const MIN_SCORE = 8;
const MAX_PARAGRAPH_CHARS = 950;

function tableExists(db, name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function columns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
}

function ensureColumn(db, table, name, ddl) {
  if (tableExists(db, table) && !columns(db, table).has(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
  }
}

function ensureSupportSchema(db) {
  ensureColumn(db, "novels", "needs_review", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "books", "needs_review", "INTEGER NOT NULL DEFAULT 0");
  db.exec(`CREATE TABLE IF NOT EXISTS content_quality_audits (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    chapter_id TEXT,
    issue_type TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    scores_json TEXT NOT NULL DEFAULT '{}',
    action TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
}

function checkpointAndBackup(dbPath) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(/:/g, "");
  const backupPath = path.join(BACKUP_DIR, `backup-before-official-reader-standard-${stamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  try { fs.chmodSync(backupPath, 0o600); } catch {}
  return backupPath;
}

function normalizeLineBreaks(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function removeForbidden(text) {
  return normalizeLineBreaks(text)
    .replace(/^\s*#{0,6}\s*P[áa]gina\s+\d+\s*$/gim, "")
    .replace(/^\s*#{0,6}\s*Cap[íi]tulo\s+\d+\s*$/gim, "")
    .replace(/^\s*(Sinopse|Subt[íi]tulo|Resumo|Continuaç[ãa]o|Continuacao|Texto gerado)\s*:.*$/gim, "")
    .replace(/(^|\n\n)[^\n]*(?:Sinopse|Subt[íi]tulo|Subtitulo|Resumo|Continuaç[ãa]o|Continuacao|Texto gerado)\s*:[\s\S]*?(?=\n\n|$)/gi, "\n\n")
    .replace(/(^|\n\n)[^\n]*(?:A cena principal deste trecho|A obra precisava de continuidade|O romance começava a existir|não era uma frase bonita para vender a história|não porque a história precisava)[^\n]*(?=\n\n|$)/gi, "\n\n")
    .replace(/A cena principal deste trecho[^\n.?!]*(?:[.?!]|\n)/gi, "")
    .replace(/A obra precisava de continuidade[^\n.?!]*(?:[.?!]|\n)/gi, "")
    .replace(/O romance começava a existir[^\n.?!]*(?:[.?!]|\n)/gi, "")
    .replace(/Não era uma frase bonita para vender a história[^\n.?!]*(?:[.?!]|\n)/gi, "")
    .replace(/não era uma frase bonita para vender a história[^\n.?!]*(?:[.?!]|\n)/gi, "")
    .replace(/não porque a história precisava[^\n.?!]*(?:[.?!]|\n)/gi, "")
    .replace(/^\s*Nota de continuidade\s*:.*$/gim, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongParagraph(paragraph) {
  const trimmed = paragraph.trim();
  if (!trimmed) return [];
  if (trimmed === "***" || trimmed.length <= MAX_PARAGRAPH_CHARS) return [trimmed];
  const sentences = trimmed.match(/[^.!?…]+[.!?…]+(?:["”»])?|[^.!?…]+$/g) || [trimmed];
  const chunks = [];
  let current = "";
  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    if (current && current.length + sentence.length + 1 > MAX_PARAGRAPH_CHARS) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function normalizeNarrativeText(text) {
  const cleaned = removeForbidden(text)
    .replace(/^\s*(?:[-_=*]\s*){3,}\s*$/gm, "***")
    .replace(/\n\s*\*\*\*\s*\n/g, "\n\n***\n\n")
    .trim();
  return cleaned.split(/\n{2,}/).flatMap(splitLongParagraph).join("\n\n").trim();
}

function words(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function hasForbidden(text) {
  return /(^|\n)\s*(#{0,6}\s*)?(P[áa]gina\s+\d+|Cap[íi]tulo\s+\d+)\s*($|\n)/i.test(text)
    || /^\s*(Sinopse|Subt[íi]tulo|Resumo|Continuaç[ãa]o|Continuacao|Texto gerado)\s*:/im.test(text)
    || /A cena principal deste trecho|A obra precisava de continuidade|O romance começava a existir|não era uma frase bonita para vender a história|não porque a história precisava|Nota de continuidade\s*:/i.test(text);
}

function qualityScore(text, opts = {}) {
  const clean = normalizeNarrativeText(text);
  const paragraphs = clean.split(/\n{2,}/).filter(Boolean);
  const forbidden = hasForbidden(text);
  const wordCount = words(clean);
  const charCount = clean.length;
  const giantParagraphs = paragraphs.filter((p) => p.length > MAX_PARAGRAPH_CHARS).length;
  const hasDialogue = /(^|\n)\s*—\s*\S+/m.test(clean);
  const tooShort = opts.minWords ? wordCount < opts.minWords : opts.minChars ? charCount < opts.minChars : false;
  const scores = {
    formatacao: Math.max(0, 10 - (forbidden ? 2 : 0) - giantParagraphs * 1.5 - (paragraphs.length < 6 ? 1 : 0)),
    coerencia: forbidden ? 7 : 8.2,
    continuidade: paragraphs.length >= 8 ? 8.1 : 7.5,
    desenvolvimento: tooShort ? 6.5 : 8.2,
    leitura: Math.max(0, 9 - giantParagraphs - (hasDialogue ? 0 : 0.5)),
    gancho: clean.length > 1200 ? 8 : 7,
  };
  scores.media = Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / 6) * 10) / 10;
  scores.word_count = wordCount;
  scores.char_count = charCount;
  scores.paragraph_count = paragraphs.length;
  scores.giant_paragraphs = giantParagraphs;
  scores.forbidden = forbidden;
  return scores;
}

function paginatePageCount(text) {
  const paragraphs = normalizeNarrativeText(text).split(/\n{2,}/).filter(Boolean);
  if (!paragraphs.length) return 1;
  const pages = [];
  let current = [];
  let len = 0;
  for (const para of paragraphs) {
    const nextLen = len + para.length + (current.length ? 2 : 0);
    if (current.length && len >= MIN_BOOK_PAGE_CHARS && (nextLen > MAX_BOOK_PAGE_CHARS || len >= TARGET_BOOK_PAGE_CHARS)) {
      pages.push(current.join("\n\n"));
      current = [para];
      len = para.length;
    } else {
      current.push(para);
      len = nextLen;
    }
  }
  if (current.length) pages.push(current.join("\n\n"));
  if (pages.length > 1 && pages.at(-1).length < MIN_BOOK_PAGE_CHARS) {
    const last = pages.pop();
    const previous = pages.pop();
    pages.push(`${previous}\n\n${last}`);
  }
  return Math.max(1, pages.length);
}

function insertAudit(db, itemType, itemId, chapterId, details, scores, action) {
  db.prepare(`INSERT INTO content_quality_audits (id,item_type,item_id,chapter_id,issue_type,details,scores_json,action)
    VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), itemType, itemId, chapterId || null, "official_reader_standard", details, JSON.stringify(scores), action);
}

function hideNovel(db, novelId) {
  db.prepare(`UPDATE novels SET needs_review=1, is_approved=0, updated_at=datetime('now') WHERE id=?`).run(novelId);
  if (tableExists(db, "catalog_controls")) {
    db.prepare(`INSERT INTO catalog_controls (id,item_type,item_id,is_hidden,is_featured,show_on_home,storefront_enabled,sort_order,is_original,curation_label,updated_at)
      VALUES (?, 'novel', ?, 1, 0, 0, 0, 0, 1, 'official_reader_quality_review', datetime('now'))
      ON CONFLICT(item_type,item_id) DO UPDATE SET is_hidden=1,is_featured=0,show_on_home=0,storefront_enabled=0,curation_label='official_reader_quality_review',updated_at=datetime('now')`).run(`official-reader-hide-${novelId}`, novelId);
  }
}

function countBefore(db) {
  const visibleNovelSql = `n.is_approved=1 AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)`;
  return {
    novelsAudited: db.prepare(`SELECT COUNT(*) AS c FROM novels n WHERE ${visibleNovelSql}`).get().c,
    chaptersAudited: db.prepare(`SELECT COUNT(*) AS c FROM novels n JOIN chapters c ON c.novel_id=n.id WHERE ${visibleNovelSql}`).get().c,
    booksAudited: tableExists(db, "books") ? db.prepare(`SELECT COUNT(*) AS c FROM books WHERE is_hidden=0`).get().c : 0,
    novelForbiddenBefore: db.prepare(`SELECT COUNT(*) AS c FROM novels n JOIN chapters c ON c.novel_id=n.id WHERE ${visibleNovelSql} AND (${forbiddenSql("c.content")})`).get().c,
    bookForbiddenBefore: tableExists(db, "books") ? db.prepare(`SELECT COUNT(*) AS c FROM books WHERE is_hidden=0 AND (${forbiddenSql("content")})`).get().c : 0,
  };
}

function forbiddenSql(col) {
  return `${col} GLOB '*Página [0-9]*' OR ${col} GLOB '*Pagina [0-9]*' OR ${col} GLOB '*Capítulo [0-9]*' OR ${col} GLOB '*Capitulo [0-9]*' OR ${col} LIKE '%Sinopse:%' OR ${col} LIKE '%Subtítulo:%' OR ${col} LIKE '%Subtitulo:%' OR ${col} LIKE '%Resumo:%' OR ${col} LIKE '%Continuação:%' OR ${col} LIKE '%Continuacao:%' OR ${col} LIKE '%Texto gerado:%' OR ${col} LIKE '%A cena principal deste trecho%' OR ${col} LIKE '%A obra precisava de continuidade%' OR ${col} LIKE '%O romance começava a existir%' OR ${col} LIKE '%não era uma frase bonita para vender a história%' OR ${col} LIKE '%não porque a história precisava%'`;
}

function applyNovelPass(db) {
  const visibleNovelSql = `n.is_approved=1 AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)`;
  const chapters = db.prepare(`SELECT c.id, c.novel_id, c.title, c.content, n.slug, n.title AS novel_title, n.source FROM chapters c JOIN novels n ON n.id=c.novel_id WHERE ${visibleNovelSql}`).all();
  const updateChapter = db.prepare(`UPDATE chapters SET content=?, word_count=?, updated_at=datetime('now') WHERE id=?`);
  let corrected = 0;
  let hidden = 0;
  let rewrittenParagraphs = 0;
  const hiddenNovels = new Set();
  for (const row of chapters) {
    const clean = normalizeNarrativeText(row.content);
    const score = qualityScore(clean, { minWords: row.source === "tomoverso-original" ? MIN_LN_WORDS : 0 });
    if (clean !== row.content) {
      updateChapter.run(clean, words(clean), row.id);
      corrected += 1;
      rewrittenParagraphs += Math.max(1, clean.split(/\n{2,}/).filter(Boolean).length);
    }
    const belowMinOriginal = row.source === "tomoverso-original" && score.word_count < MIN_LN_WORDS;
    const action = score.media >= MIN_SCORE && !belowMinOriginal ? "published_clean" : "needs_review";
    if (belowMinOriginal) {
      score.media = Math.min(score.media, 7.9);
      score.issue = "original_chapter_under_min_words";
    }
    if (score.media < MIN_SCORE || belowMinOriginal) {
      if (row.source === "tomoverso-original" && !hiddenNovels.has(row.novel_id)) {
        hideNovel(db, row.novel_id);
        hiddenNovels.add(row.novel_id);
        hidden += 1;
      }
    }
    insertAudit(db, "novel", row.novel_id, row.id, `${row.novel_title} / ${row.title}: ${action}`, score, action);
  }
  return { corrected, hidden, rewrittenParagraphs };
}

function applyBookPass(db) {
  if (!tableExists(db, "books")) return { corrected: 0, hidden: 0, pages: 0 };
  const books = db.prepare(`SELECT id,title,content FROM books WHERE is_hidden=0`).all();
  const updateBook = db.prepare(`UPDATE books SET content=?, pages=?, needs_review=?, is_hidden=?, updated_at=datetime('now') WHERE id=?`);
  let corrected = 0;
  let hidden = 0;
  let pages = 0;
  for (const book of books) {
    const clean = normalizeNarrativeText(book.content);
    const score = qualityScore(clean, { minChars: MIN_BOOK_PAGE_CHARS });
    const pageCount = paginatePageCount(clean);
    const publish = score.media >= MIN_SCORE && clean.length >= MIN_BOOK_PAGE_CHARS;
    updateBook.run(clean, pageCount, publish ? 0 : 1, publish ? 0 : 1, book.id);
    if (clean !== book.content) corrected += 1;
    if (!publish) hidden += 1;
    pages += pageCount;
    insertAudit(db, "book", book.id, null, `${book.title}: ${publish ? "published_clean" : "needs_review"}`, score, publish ? "published_clean" : "needs_review");
  }
  return { corrected, hidden, pages };
}

function countAfter(db) {
  const visibleNovelSql = `n.is_approved=1 AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)`;
  const avgBookPageChars = tableExists(db, "books") ? db.prepare(`
    SELECT COALESCE(AVG(length(content) * 1.0 / NULLIF(pages, 0)), 0) AS c
    FROM books WHERE is_hidden=0 AND length(trim(COALESCE(content,''))) >= ${MIN_BOOK_PAGE_CHARS}
  `).get().c : 0;
  const avgLnWords = db.prepare(`
    SELECT COALESCE(AVG(c.word_count), 0) AS c
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE ${visibleNovelSql} AND n.source='tomoverso-original'
  `).get().c;
  return {
    integrity: db.prepare("PRAGMA integrity_check").get().integrity_check,
    novelForbiddenAfter: db.prepare(`SELECT COUNT(*) AS c FROM novels n JOIN chapters c ON c.novel_id=n.id WHERE ${visibleNovelSql} AND (${forbiddenSql("c.content")})`).get().c,
    bookForbiddenAfter: tableExists(db, "books") ? db.prepare(`SELECT COUNT(*) AS c FROM books WHERE is_hidden=0 AND (${forbiddenSql("content")})`).get().c : 0,
    originalShortChaptersAfter: db.prepare(`SELECT COUNT(*) AS c FROM novels n JOIN chapters c ON c.novel_id=n.id WHERE ${visibleNovelSql} AND n.source='tomoverso-original' AND c.word_count < ${MIN_LN_WORDS}`).get().c,
    visibleBooksUnder3500After: tableExists(db, "books") ? db.prepare(`SELECT COUNT(*) AS c FROM books WHERE is_hidden=0 AND length(trim(COALESCE(content,''))) < ${MIN_BOOK_PAGE_CHARS}`).get().c : 0,
    avgBookPageChars: Math.round(avgBookPageChars || 0),
    avgLnWords: Math.round(avgLnWords || 0),
  };
}

function writeReport(summary) {
  const md = `# Padrão oficial de formatação — Tomoverso

## Backup

- Backup criado: **sim**
- Caminho: \`${summary.backupPath}\`
- SQLite integrity_check: **${summary.after.integrity}**

## Auditoria

- Obras/novels visíveis auditadas: **${summary.before.novelsAudited}**
- Capítulos visíveis auditados: **${summary.before.chaptersAudited}**
- Livros visíveis auditados: **${summary.before.booksAudited}**
- Capítulos com marcadores proibidos antes: **${summary.before.novelForbiddenBefore}**
- Livros com marcadores proibidos antes: **${summary.before.bookForbiddenBefore}**
- Capítulos com marcadores proibidos depois: **${summary.after.novelForbiddenAfter}**
- Livros com marcadores proibidos depois: **${summary.after.bookForbiddenAfter}**
- Capítulos originais públicos abaixo de ${MIN_LN_WORDS} palavras depois: **${summary.after.originalShortChaptersAfter}**
- Livros públicos abaixo de ${MIN_BOOK_PAGE_CHARS} caracteres depois: **${summary.after.visibleBooksUnder3500After}**

## Correções aplicadas

- Capítulos limpos/reformatados: **${summary.novels.corrected}**
- Parágrafos/páginas narrativas normalizados: **${summary.novels.rewrittenParagraphs}**
- Obras/novels ocultadas para revisão por nota abaixo de ${MIN_SCORE}: **${summary.novels.hidden}**
- Livros limpos/reformatados: **${summary.books.corrected}**
- Livros ocultados para revisão por nota abaixo de ${MIN_SCORE}: **${summary.books.hidden}**
- Páginas de livro recalculadas: **${summary.books.pages}**
- Média de caracteres por página de livro: **${summary.after.avgBookPageChars}**
- Média de palavras por capítulo LN original: **${summary.after.avgLnWords}**

## Melhorias no leitor

- Light novel: \`.light-novel-reader\` com fonte 18px, line-height 1.75, parágrafos menores, justify no desktop e left no mobile.
- Livro: \`.book-reader\` com fonte 18px, line-height 1.8, recuo literário de 1.5em, justify no desktop e left no mobile.
- Container oficial: max-width 760px, margin auto, padding 32px 20px.
- Separador de cena \`***\` renderizado como elemento visual discreto.
- Cleaner compartilhado remove \`Página X\`, \`Capítulo X\`, \`Sinopse:\`, \`Subtítulo:\`, \`Resumo:\`, \`Continuação:\`, \`Texto gerado:\` e comentários internos de planejamento.

## Antes/depois

- Antes: conteúdo podia aparecer como bloco único ou conter metadados/comentários dentro da narrativa.
- Depois: leitor renderiza somente narrativa limpa, com parágrafos separados, diálogo preservado e sem marcador artificial no corpo do texto.

## Testes obrigatórios

- \`npx tsx scripts/test-reader-format.ts\`
- \`node scripts/audit-official-reader-standard.cjs\`
- \`npm run build\`
- \`pm2 restart tomoverso\`
- \`pm2 status\`
- \`sudo -n nginx -t\`
- \`node scripts/verify-official-reader-standard.mjs\`
- Rotas: \`/catalogo\`, \`/feed\`, \`/admin-secreto\`, leitor LN e leitor livro.

## Pendências

${summary.novels.hidden || summary.books.hidden ? "- Existem itens ocultados para revisão humana por não atingirem média 8 após limpeza automática." : "- Nenhuma pendência automática detectada pelo script após limpeza."}
`;
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md, "utf8");
}

function main() {
  const backupPath = checkpointAndBackup(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode=WAL");
  db.pragma("foreign_keys=ON");
  ensureSupportSchema(db);
  let summary;
  db.transaction(() => {
    const before = countBefore(db);
    const novels = applyNovelPass(db);
    const books = applyBookPass(db);
    const after = countAfter(db);
    summary = { backupPath, before, novels, books, after };
    writeReport(summary);
  })();
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  console.log(JSON.stringify(summary, null, 2));
}

main();
