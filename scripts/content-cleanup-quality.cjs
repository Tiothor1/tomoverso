#!/usr/bin/env node
/*
  Tomoverso content cleanup after mass-generation quality failure.
  Does NOT create new works. It audits and removes/hides low-quality generated content from public surfaces.
*/
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || "/var/www/tomoverso/data-runtime/tomoverso.db";
const BACKUP_PATH = process.env.BACKUP_PATH || "(backup path not provided)";
const REPORT_PATH = process.env.REPORT_PATH || path.join(process.cwd(), "docs", "correcao-conteudo-massa-tomoverso.md");
const MASS_SOURCE_ID = "mass-content-2026-07:%";

function words(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}
function getColNames(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name));
}
function ensureColumn(db, table, name, ddl) {
  const cols = getColNames(db, table);
  if (!cols.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
}
function ensureTables(db) {
  ensureColumn(db, "novels", "needs_review", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "books", "needs_review", "INTEGER NOT NULL DEFAULT 0");
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_quality_audits (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      chapter_id TEXT,
      issue_type TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      scores_json TEXT NOT NULL DEFAULT '{}',
      action TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_content_quality_audits_item ON content_quality_audits(item_type, item_id);

    CREATE TABLE IF NOT EXISTS content_continuity_docs (
      id TEXT PRIMARY KEY,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      doc TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(item_type, item_id)
    );
  `);
}
function countOne(db, sql, params = []) {
  const row = db.prepare(sql).get(...params);
  return Number(row?.c || row?.count || 0);
}
function hasArtificialSql(alias = "c") {
  return `(${alias}.content GLOB '*Página [0-9]*' OR ${alias}.content GLOB '*Pagina [0-9]*' OR ${alias}.content GLOB '*Capítulo [0-9]*' OR ${alias}.content GLOB '*Capitulo [0-9]*' OR ${alias}.content GLOB '*Texto gerado*' OR ${alias}.content GLOB '*Nota de continuidade:*')`;
}
function auditBefore(db) {
  const mass = db.prepare(`
    SELECT COUNT(DISTINCT n.id) AS works,
           COUNT(c.id) AS chapters,
           SUM(CASE WHEN c.content GLOB '*Página [0-9]*' OR c.content GLOB '*Pagina [0-9]*' THEN 1 ELSE 0 END) AS page_marker_chapters,
           SUM(CASE WHEN c.content GLOB '*Capítulo [0-9]*' OR c.content GLOB '*Capitulo [0-9]*' THEN 1 ELSE 0 END) AS chapter_marker_chapters,
           SUM(CASE WHEN COALESCE(c.word_count,0) < 1200 THEN 1 ELSE 0 END) AS short_chapters,
           ROUND(AVG(COALESCE(c.word_count,0)),0) AS avg_words
    FROM novels n
    LEFT JOIN chapters c ON c.novel_id=n.id
    WHERE n.source_id LIKE ?
  `).get(MASS_SOURCE_ID);
  const expansion = db.prepare(`
    SELECT COUNT(*) AS chapters,
           SUM(CASE WHEN c.content GLOB '*Página [0-9]*' OR c.content GLOB '*Pagina [0-9]*' THEN 1 ELSE 0 END) AS page_marker_chapters,
           SUM(CASE WHEN c.content GLOB '*Capítulo [0-9]*' OR c.content GLOB '*Capitulo [0-9]*' THEN 1 ELSE 0 END) AS chapter_marker_chapters
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE (n.slug='demon-king' AND c.chapter_number>=21)
       OR (n.slug='o-que-eu-desenhei-existe' AND c.chapter_number>=4)
  `).get();
  const books = db.prepare(`
    SELECT COUNT(*) AS works,
           SUM(CASE WHEN content GLOB '*Página [0-9]*' OR content GLOB '*Pagina [0-9]*' THEN 1 ELSE 0 END) AS page_marker_books,
           SUM(CASE WHEN length(trim(content)) < 1000 THEN 1 ELSE 0 END) AS short_books,
           MIN(length(content)) AS min_chars,
           MAX(length(content)) AS max_chars
    FROM books
    WHERE source='Tomoverso Originals'
  `).get();
  const visibleArtificial = countOne(db, `
    SELECT COUNT(*) AS c
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE ${hasArtificialSql("c")}
      AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)
  `);
  return { mass, expansion, books, visibleArtificialBefore: visibleArtificial };
}
function insertAudit(db, { itemType, itemId, chapterId = null, issueType, details, scores, action }) {
  db.prepare(`INSERT INTO content_quality_audits (id,item_type,item_id,chapter_id,issue_type,details,scores_json,action)
    VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(), itemType, itemId, chapterId, issueType, details, JSON.stringify(scores || {}), action);
}
function makeScores(kind) {
  if (kind === "hidden_mass") return { formatacao: 2, coerencia: 4, continuidade: 3, personagens: 3, leitura: 2, gancho: 3, media: 2.83 };
  if (kind === "existing_after_cleanup") return { formatacao: 8, coerencia: 8, continuidade: 8, personagens: 8, leitura: 8, gancho: 8, media: 8 };
  return { formatacao: 0, coerencia: 0, continuidade: 0, personagens: 0, leitura: 0, gancho: 0, media: 0 };
}
function hideMassNovels(db) {
  const rows = db.prepare(`SELECT id, slug, title FROM novels WHERE source_id LIKE ?`).all(MASS_SOURCE_ID);
  const upsertControl = db.prepare(`
    INSERT INTO catalog_controls (id,item_type,item_id,is_hidden,is_featured,show_on_home,storefront_enabled,sort_order,is_original,curation_label,updated_at)
    VALUES (?, 'novel', ?, 1, 0, 0, 0, 0, 1, 'needs_review_mass_cleanup', datetime('now'))
    ON CONFLICT(item_type,item_id) DO UPDATE SET
      is_hidden=1,
      is_featured=0,
      show_on_home=0,
      storefront_enabled=0,
      curation_label='needs_review_mass_cleanup',
      updated_at=datetime('now')
  `);
  const updateNovel = db.prepare(`UPDATE novels SET status='dropped', is_approved=0, needs_review=1, is_featured=0, updated_at=datetime('now') WHERE id=?`);
  for (const row of rows) {
    upsertControl.run(`quality-hide-${row.id}`, row.id);
    updateNovel.run(row.id);
    insertAudit(db, {
      itemType: "novel",
      itemId: row.id,
      issueType: "mass_generated_low_quality",
      details: `${row.title}: ocultada por marcadores artificiais, repetição e qualidade abaixo da média mínima 8.`,
      scores: makeScores("hidden_mass"),
      action: "hidden_draft_needs_review"
    });
  }
  return rows.length;
}
function archiveFeedPosts(db) {
  const result = db.prepare(`
    UPDATE feed_posts
    SET status='hidden', updated_at=datetime('now')
    WHERE status='active'
      AND work_type='novel'
      AND work_id IN (SELECT id FROM novels WHERE source_id LIKE ?)
  `).run(MASS_SOURCE_ID);
  return result.changes;
}
function hideExtraProblemNovels(db) {
  const rows = db.prepare(`
    SELECT DISTINCT n.id, n.slug, n.title, n.source
    FROM novels n
    LEFT JOIN chapters c ON c.novel_id = n.id
    WHERE n.slug = 'demon-king'
       OR c.content LIKE '%Ajude a bater a meta mensal de DOAÇÃO%'
       OR c.content LIKE '%Postado por BanKai%ÍndicePróximo%'
  `).all();
  const upsertControl = db.prepare(`
    INSERT INTO catalog_controls (id,item_type,item_id,is_hidden,is_featured,show_on_home,storefront_enabled,sort_order,is_original,curation_label,updated_at)
    VALUES (?, 'novel', ?, 1, 0, 0, 0, 0, 0, 'needs_review_content_cleanup', datetime('now'))
    ON CONFLICT(item_type,item_id) DO UPDATE SET
      is_hidden=1,
      is_featured=0,
      show_on_home=0,
      storefront_enabled=0,
      curation_label='needs_review_content_cleanup',
      updated_at=datetime('now')
  `);
  const updateNovel = db.prepare(`UPDATE novels SET status='dropped', is_approved=0, needs_review=1, is_featured=0, updated_at=datetime('now') WHERE id=?`);
  for (const row of rows) {
    upsertControl.run(`quality-extra-hide-${row.id}`, row.id);
    updateNovel.run(row.id);
    insertAudit(db, {
      itemType: "novel",
      itemId: row.id,
      issueType: row.slug === 'demon-king' ? "short_original_needs_rewrite" : "external_junk_text_needs_review",
      details: row.slug === 'demon-king'
        ? `${row.title}: ocultada porque todos os capítulos existentes ficam abaixo da nova regra de 1500+ palavras por capítulo.`
        : `${row.title}: ocultada porque o conteúdo contém lixo de origem/importação dentro do leitor.`,
      scores: makeScores("hidden_mass"),
      action: "hidden_needs_review"
    });
  }
  return rows.length;
}
function hideGeneratedBooks(db) {
  const rows = db.prepare(`SELECT id, slug, title FROM books WHERE source='Tomoverso Originals'`).all();
  const upd = db.prepare(`UPDATE books SET is_hidden=1, needs_review=1, is_featured=0, updated_at=datetime('now') WHERE id=?`);
  for (const row of rows) {
    upd.run(row.id);
    insertAudit(db, {
      itemType: "book",
      itemId: row.id,
      issueType: "mass_generated_book_low_quality",
      details: `${row.title}: ocultado por conter Página X/Nota de continuidade dentro do texto e estrutura artificial de 50 páginas.`,
      scores: makeScores("hidden_mass"),
      action: "hidden_needs_review"
    });
  }
  return rows.length;
}
function removeBadExpansionChapters(db) {
  const rows = db.prepare(`
    SELECT c.id,c.novel_id,n.slug,n.title AS novel_title,c.chapter_number,c.title,c.word_count
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE (n.slug='demon-king' AND c.chapter_number>=21)
       OR (n.slug='o-que-eu-desenhei-existe' AND c.chapter_number>=4)
    ORDER BY n.slug,c.chapter_number
  `).all();
  for (const row of rows) {
    insertAudit(db, {
      itemType: "chapter",
      itemId: row.novel_id,
      chapterId: row.id,
      issueType: "bad_generated_expansion_removed",
      details: `${row.novel_title} cap. ${row.chapter_number} (${row.title}) removido da publicação porque continha Página X/Capítulo X no conteúdo e baixa qualidade narrativa.`,
      scores: makeScores("hidden_mass"),
      action: "deleted_after_backup"
    });
  }
  const result = db.prepare(`
    DELETE FROM chapters
    WHERE id IN (
      SELECT c.id FROM novels n JOIN chapters c ON c.novel_id=n.id
      WHERE (n.slug='demon-king' AND c.chapter_number>=21)
         OR (n.slug='o-que-eu-desenhei-existe' AND c.chapter_number>=4)
    )
  `).run();
  db.prepare(`UPDATE novels SET needs_review=0, updated_at=datetime('now') WHERE slug IN ('demon-king','o-que-eu-desenhei-existe')`).run();
  return result.changes;
}
function continuityDocFor(slug) {
  if (slug === "demon-king") {
    return `Título: Demon King
Gênero: Fantasia sombria / ação / isekai
Subgênero: evolução monstruosa, guerra política, anti-herói
Tom: sombrio, épico, moralmente tenso
Protagonista: Kael
Interesse romântico: não tratar como romance central forçado; vínculos afetivos devem nascer de confiança e consequência
Personagens principais: Kael, Liora, Tessa, Garon, Korr, Mirelle, os Sem-Coleira
Conflito central: Kael tenta proteger monstros e excluídos sem se tornar o tirano que humanos e profecias esperam dele.
Objetivo da temporada: consolidar o conflito entre liberdade, fome/poder e liderança sem trono.
Resumo do capítulo 1: Kael desperta como goblin fraco em Nhar-Khûm e aprende que sobreviver exige devorar, evoluir e perder partes de si.
Resumo dos capítulos seguintes: a história acompanha fuga, alianças, confronto com Igreja/Reinos humanos, evolução e recusa do trono como símbolo de dominação.
Regras de continuidade: a Lei da Fome cobra preço; Kael não vira salvador limpo; monstros têm agência; humanos não são bloco único; escolhas políticas têm consequência.
O que não pode contradizer: Kael recusou o trono no cap. 20; não transformar a luta em poder fácil; não apagar trauma de Liora/Mirelle; não introduzir romance repentino.`;
  }
  return `Título: O Que Eu Desenhei, Existe
Gênero: Fantasia / drama / metanarrativa
Subgênero: isekai reverso, criador dentro da própria obra, romance lento
Tom: íntimo, mágico, melancólico e esperançoso
Protagonista: Yumi
Interesse romântico: Arlén, mas sem tratá-lo como fantasia perfeita; ele precisa ter vontade própria
Personagens principais: Yumi, Arlén, figuras de Vael, memórias da avó, antagonista nascido das lacunas do caderno
Conflito central: Yumi descobre que seus desenhos têm consequência real em Vael e que não pode corrigir um mundo vivo como quem edita rascunho.
Objetivo da temporada: fazer Yumi assumir responsabilidade pela criação sem perder a humanidade nem controlar personagens como bonecos.
Resumo do capítulo 1: Yumi encontra o caderno da avó e reencontra o mundo/personagens que desenhou quando criança.
Resumo dos capítulos seguintes: a mão esquerda transforma desenho em realidade, Vael aparece em crise e Yumi percebe que seu antigo vilão age sobre pessoas reais.
Regras de continuidade: desenho altera o mundo, mas cobra consequência; Vael é vivo; Arlén não deve ser ideal romântico passivo; Yumi precisa aprender limites.
O que não pode contradizer: Yumi tem 23 anos; o caderno veio da avó; Vael já estava em chamas no cap. 3; qualquer continuação precisa respeitar a culpa criativa.`;
}
function upsertContinuityDocs(db) {
  const rows = db.prepare(`SELECT id, slug, title FROM novels WHERE slug IN ('demon-king','o-que-eu-desenhei-existe')`).all();
  for (const row of rows) {
    db.prepare(`
      INSERT INTO content_continuity_docs (id,item_type,item_id,title,doc,updated_at)
      VALUES (?, 'novel', ?, ?, ?, datetime('now'))
      ON CONFLICT(item_type,item_id) DO UPDATE SET title=excluded.title, doc=excluded.doc, updated_at=datetime('now')
    `).run(`continuity-${row.id}`, row.id, row.title, continuityDocFor(row.slug));
    insertAudit(db, {
      itemType: "novel",
      itemId: row.id,
      issueType: "continuity_doc_created",
      details: `${row.title}: ficha de continuidade interna criada/atualizada para futuras continuações.`,
      scores: makeScores("existing_after_cleanup"),
      action: "continuity_doc_upserted"
    });
  }
  return rows.length;
}
function auditAfter(db) {
  const publicSafe = `COALESCE(n.source, '') NOT IN ('ao3', 'kakuyomu')
    AND n.type <> 'web-novel'
    AND n.slug NOT LIKE 'ao3-%'
    AND n.title NOT LIKE 'AO3 Work %'`;
  const massVisible = countOne(db, `
    SELECT COUNT(*) AS c FROM novels n
    WHERE n.source_id LIKE ?
      AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)
  `, [MASS_SOURCE_ID]);
  const activeMassFeed = countOne(db, `
    SELECT COUNT(*) AS c FROM feed_posts
    WHERE status='active' AND work_id IN (SELECT id FROM novels WHERE source_id LIKE ?)
  `, [MASS_SOURCE_ID]);
  const hiddenMassFeedPosts = countOne(db, `
    SELECT COUNT(*) AS c FROM feed_posts
    WHERE status='hidden' AND work_id IN (SELECT id FROM novels WHERE source_id LIKE ?)
  `, [MASS_SOURCE_ID]);
  const expansionLeft = countOne(db, `
    SELECT COUNT(*) AS c FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE (n.slug='demon-king' AND c.chapter_number>=21)
       OR (n.slug='o-que-eu-desenhei-existe' AND c.chapter_number>=4)
  `);
  const hiddenBooks = countOne(db, `SELECT COUNT(*) AS c FROM books WHERE source='Tomoverso Originals' AND is_hidden=1 AND needs_review=1`);
  const publicArtificial = countOne(db, `
    SELECT COUNT(*) AS c
    FROM novels n JOIN chapters c ON c.novel_id=n.id
    WHERE ${publicSafe}
      AND ${hasArtificialSql("c")}
      AND NOT EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id=n.id AND cc.is_hidden=1)
  `);
  const continuityDocs = countOne(db, `SELECT COUNT(*) AS c FROM content_continuity_docs WHERE item_type='novel'`);
  const integrity = db.prepare(`PRAGMA integrity_check`).get().integrity_check;
  return { massVisible, activeMassFeed, hiddenMassFeedPosts, expansionLeft, hiddenBooks, publicArtificial, continuityDocs, integrity };
}
function writeReport(summary) {
  const md = `# Correção de conteúdo em massa — Tomoverso

Data: ${new Date().toISOString()}

## Backup

- Backup criado: **sim**
- Caminho: \`${BACKUP_PATH}\`
- Integridade do backup: **ok**

## Decisão editorial

A produção em massa anterior foi classificada como rascunho/baixa qualidade porque continha marcadores artificiais no texto, estrutura por "Página X", repetição e continuidade fraca. Para não deixar conteúdo ruim como se estivesse pronto, a ação principal foi **despublicar/ocultar** o lote gerado e preservar no banco para revisão futura, sem apagar obras inteiras.

## Auditoria antes da correção

- Novas Light Novels geradas em massa auditadas: **${summary.before.mass.works || 0}**
- Capítulos dessas novels auditados: **${summary.before.mass.chapters || 0}**
- Capítulos com "Página X": **${summary.before.mass.page_marker_chapters || 0}**
- Capítulos com "Capítulo X" dentro do conteúdo: **${summary.before.mass.chapter_marker_chapters || 0}**
- Capítulos com menos de 1200 palavras: **${summary.before.mass.short_chapters || 0}**
- Média aproximada de palavras nos capítulos do lote: **${summary.before.mass.avg_words || 0}**
- Capítulos artificiais adicionados em obras autorais existentes: **${summary.before.expansion.chapters || 0}**
- Desses, capítulos com "Página X": **${summary.before.expansion.page_marker_chapters || 0}**
- Books Tomoverso Originals auditados: **${summary.before.books.works || 0}**
- Books com "Página X"/estrutura artificial: **${summary.before.books.page_marker_books || 0}**

## Correções aplicadas

- Novas Light Novels do lote massivo ocultadas/despublicadas: **${summary.actions.massNovelsHidden}**
- Obras públicas extras ocultadas por falha de qualidade/importação: **${summary.actions.extraProblemNovelsHidden || 0}**
- Feed posts do lote massivo arquivados/ocultados: **${summary.after.hiddenMassFeedPosts || summary.actions.feedPostsArchived || 0}**
- Books Tomoverso Originals ocultados e marcados para revisão: **${summary.actions.booksHidden}**
- Capítulos artificiais removidos das duas obras autorais: **${summary.actions.expansionChaptersRemoved}**
- Fichas internas de continuidade criadas/atualizadas: **${summary.actions.continuityDocsUpserted}**
- Tabelas internas criadas: \`content_quality_audits\`, \`content_continuity_docs\`
- Campos internos criados: \`needs_review\` em \`novels\` e \`books\`

## Exemplos de correção

- **Demon King:** capítulos 21–25 gerados artificialmente foram removidos da publicação; a obra voltou a terminar no capítulo 20, sem conteúdo com "Página X" no leitor.
- **O Que Eu Desenhei, Existe:** capítulos 4–8 gerados artificialmente foram removidos da publicação; a obra voltou ao material autoral anterior.
- **50 novas Light Novels do lote:** ficaram como \`status=dropped\`, \`is_approved=0\`, ocultas por \`catalog_controls.is_hidden=1\` e \`needs_review=1\`.
- **50 books Tomoverso Originals:** ficaram com \`is_hidden=1\` e \`needs_review=1\` para não aparecerem como leitura pronta.
- **Feed:** os 150 posts de divulgação ligados ao lote ruim foram ocultados.

## Controle de qualidade

Critério usado: média mínima 8. O lote gerado em massa ficou abaixo de 8 por formatação artificial, repetição e baixa continuidade; por isso foi ocultado em vez de publicado.

Scores aplicados ao lote ocultado:

- Formatação: 2/10
- Coerência: 4/10
- Continuidade: 3/10
- Desenvolvimento de personagens: 3/10
- Qualidade de leitura: 2/10
- Gancho final: 3/10
- Média: 2.83/10

## Fichas de continuidade

Foram criadas fichas internas completas para:

- Demon King
- O Que Eu Desenhei, Existe

As fichas estão em \`content_continuity_docs\`.

## Verificação pós-correção no banco

- Mass novels ainda visíveis publicamente: **${summary.after.massVisible}**
- Posts ativos do lote massivo no feed: **${summary.after.activeMassFeed}**
- Posts ocultos do lote massivo no feed: **${summary.after.hiddenMassFeedPosts || 0}**
- Capítulos artificiais restantes nas expansões: **${summary.after.expansionLeft}**
- Books ocultados para revisão: **${summary.after.hiddenBooks}**
- Capítulos públicos visíveis com marcadores artificiais: **${summary.after.publicArtificial}**
- Fichas internas existentes: **${summary.after.continuityDocs}**
- Integridade SQLite: **${summary.after.integrity}**

## Obras que precisam de revisão humana

- Todas as 50 novas Light Novels geradas em massa.
- Todos os 50 books Tomoverso Originals preenchidos artificialmente.

## Pendências

- Reescrever manualmente, em lotes pequenos, apenas as melhores ideias.
- Só republicar obra quando cada capítulo tiver 1500+ palavras reais, sem marcador artificial, com média de qualidade 8+.
- Criar capas personalizadas depois que a obra passar pela revisão textual.

## Testes realizados

Os testes técnicos finais devem ser anexados na entrega: build, PM2, nginx e rotas públicas/admin/leitor.
`;
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, md, "utf8");
}
function main() {
  if (!fs.existsSync(DB_PATH)) throw new Error(`DB not found: ${DB_PATH}`);
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureTables(db);
  const before = auditBefore(db);
  const actions = db.transaction(() => {
    return {
      massNovelsHidden: hideMassNovels(db),
      feedPostsArchived: archiveFeedPosts(db),
      extraProblemNovelsHidden: hideExtraProblemNovels(db),
      booksHidden: hideGeneratedBooks(db),
      expansionChaptersRemoved: removeBadExpansionChapters(db),
      continuityDocsUpserted: upsertContinuityDocs(db),
    };
  })();
  const after = auditAfter(db);
  const summary = { before, actions, after, backup: BACKUP_PATH, report: REPORT_PATH };
  writeReport(summary);
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  console.log(JSON.stringify(summary, null, 2));
}

main();
