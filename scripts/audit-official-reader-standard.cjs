#!/usr/bin/env node
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "/var/www/tomoverso/data-runtime/tomoverso.db";
const db = new Database(DB_PATH, { readonly: true });

function tableExists(name) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function count(sql, params = []) {
  return db.prepare(sql).get(...params).c;
}

const hiddenNovelSql = "EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)";
const visibleNovelSql = `n.is_approved=1 AND NOT ${hiddenNovelSql}`;
const forbiddenChapterSql = `(
  c.content GLOB '*Página [0-9]*'
  OR c.content GLOB '*Pagina [0-9]*'
  OR c.content GLOB '*Capítulo [0-9]*'
  OR c.content GLOB '*Capitulo [0-9]*'
  OR c.content LIKE '%Sinopse:%'
  OR c.content LIKE '%Subtítulo:%'
  OR c.content LIKE '%Subtitulo:%'
  OR c.content LIKE '%Resumo:%'
  OR c.content LIKE '%Continuação:%'
  OR c.content LIKE '%Continuacao:%'
  OR c.content LIKE '%Texto gerado:%'
  OR c.content LIKE '%A cena principal deste trecho%'
  OR c.content LIKE '%A obra precisava de continuidade%'
  OR c.content LIKE '%O romance começava a existir%'
  OR c.content LIKE '%não era uma frase bonita para vender a história%'
  OR c.content LIKE '%não porque a história precisava%'
)`;

const result = {
  dbPath: DB_PATH,
  integrity: db.prepare("PRAGMA integrity_check").get().integrity_check,
  novelsVisible: count(`SELECT COUNT(*) AS c FROM novels n WHERE ${visibleNovelSql}`),
  novelChaptersVisible: count(`SELECT COUNT(*) AS c FROM novels n JOIN chapters c ON c.novel_id=n.id WHERE ${visibleNovelSql}`),
  publicNovelChaptersWithForbiddenMarkers: count(`
    SELECT COUNT(*) AS c
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE ${visibleNovelSql} AND ${forbiddenChapterSql}
  `),
  publicOriginalNovelChaptersUnder1500Words: count(`
    SELECT COUNT(*) AS c
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE ${visibleNovelSql}
      AND n.source='tomoverso-original'
      AND COALESCE(c.word_count, 0) < 1500
  `),
  visibleBooks: tableExists("books") ? count(`SELECT COUNT(*) AS c FROM books WHERE is_hidden=0`) : 0,
  visibleBooksWithForbiddenMarkers: tableExists("books") ? count(`
    SELECT COUNT(*) AS c
    FROM books
    WHERE is_hidden=0
      AND (
        content LIKE '%Página 1%'
        OR content LIKE '%Pagina 1%'
        OR content LIKE '%Sinopse:%'
        OR content LIKE '%Subtítulo:%'
        OR content LIKE '%Subtitulo:%'
        OR content LIKE '%Texto gerado:%'
        OR content LIKE '%A cena principal deste trecho%'
        OR content LIKE '%A obra precisava de continuidade%'
        OR content LIKE '%O romance começava a existir%'
      )
  `) : 0,
  visibleBooksUnder3500Chars: tableExists("books") ? count(`
    SELECT COUNT(*) AS c
    FROM books
    WHERE is_hidden=0 AND length(trim(COALESCE(content, ''))) < 3500
  `) : 0,
  avgVisibleBookChars: tableExists("books") ? Math.round(db.prepare(`
    SELECT COALESCE(AVG(length(content)), 0) AS avg_chars
    FROM books WHERE is_hidden=0 AND length(trim(COALESCE(content, ''))) >= 3500
  `).get().avg_chars || 0) : 0,
};

db.close();
console.log(JSON.stringify(result, null, 2));
process.exit(result.integrity === "ok" ? 0 : 1);
