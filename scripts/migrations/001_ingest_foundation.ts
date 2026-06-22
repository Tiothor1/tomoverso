/**
 * Migration 001 — Fundação de ingestão
 *
 * Adiciona suporte a:
 * - Tipo 'visual-novel' no CHECK de novels.type (SQLite não permite ALTER CHECK,
 *   então recriamos a tabela preservando dados)
 * - Colunas de rastreamento de origem: source, source_id, source_url, last_synced_at,
 *   cover_source_url, cover_local_path em novels
 * - Tabela sources: registro das fontes externas (VNDB, JIKAN, AniList...)
 * - Tabela source_links: mapeamento fonte ↔ obra (deduplicação)
 * - Tabela volumes: volumes de LN (LN tem volumes, não só capítulos)
 * - Tabela tags + novel_tags: taxonomia normalizada de tags
 * - Tabela sync_runs + sync_errors: logs de execuções de sincronização
 *
 * Esta migration é IDEMPOTENTE: pode ser rodada múltiplas vezes sem erro.
 * Cria uma tabela `migrations` para rastrear o que já foi aplicado.
 */

import type Database from "better-sqlite3";

export const name = "001_ingest_foundation";

/**
 * Esta migration recria a tabela `novels` para expandir o CHECK constraint
 * (incluindo 'visual-novel'). Isso requer dropar tabelas filhas e recriá-las,
 * o que não funciona com foreign_keys=ON (CASCADE dispararia).
 *
 * IMPORTANTE: PRAGMA foreign_keys é NO-OP dentro de uma transaction no SQLite,
 * então o runner deve desabilitar FKs ANTES de chamar db.transaction().
 */
export const requiresForeignKeysOff = true;

export function up(db: Database.Database): void {
  // ── 1. Tabela de controle de migrations ────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── 2. Adicionar colunas novas em `novels` ──────────────────────────
  // Verificamos cada coluna individualmente para idempotência.
  const novelColumns = db.prepare("PRAGMA table_info(novels)").all() as Array<{ name: string }>;
  const existingCols = new Set(novelColumns.map((c) => c.name));

  const columnsToAdd: Array<{ name: string; ddl: string }> = [
    { name: "source", ddl: "ALTER TABLE novels ADD COLUMN source TEXT" },
    { name: "source_id", ddl: "ALTER TABLE novels ADD COLUMN source_id TEXT" },
    { name: "source_url", ddl: "ALTER TABLE novels ADD COLUMN source_url TEXT" },
    { name: "last_synced_at", ddl: "ALTER TABLE novels ADD COLUMN last_synced_at TEXT" },
    { name: "cover_source_url", ddl: "ALTER TABLE novels ADD COLUMN cover_source_url TEXT" },
    { name: "cover_local_path", ddl: "ALTER TABLE novels ADD COLUMN cover_local_path TEXT" },
    { name: "external_score", ddl: "ALTER TABLE novels ADD COLUMN external_score REAL" },
  ];

  for (const { name: colName, ddl } of columnsToAdd) {
    if (!existingCols.has(colName)) {
      db.exec(ddl);
      console.log(`  ✓ novels.${colName} adicionada`);
    }
  }

  // Índices parciais em novels para source/source_id
  db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_source ON novels(source, source_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_last_synced ON novels(last_synced_at);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_external_score ON novels(external_score);`);

  // ── 3. Expandir CHECK de `novels.type` para incluir 'visual-novel' ──
  // SQLite não suporta ALTER TABLE ... MODIFY CHECK. Estratégia:
  // - Detectar se o CHECK atual já permite 'visual-novel'
  // - Se não, recriar a tabela com o novo CHECK, copiando dados.
  const tableSql = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='novels'")
    .get() as { sql: string } | undefined;

  if (tableSql && !tableSql.sql.includes("'visual-novel'")) {
    console.log("  → Recriando tabela novels para expandir CHECK (preserva FKs e dados)");

    // NOTA: foreign_keys=OFF é setado pelo runner ANTES do db.transaction().
    // PRAGMA foreign_keys é no-op dentro de transaction no SQLite.

    // ── PASSO A: dump de todas as tabelas filhas que têm FK → novels ──
    // SQLite renomeia FKs automaticamente quando a tabela referenciada é renomeada.
    // Para preservar dados + evitar CASCADE ao dropar _novels_old, fazemos dump
    // antes e recriamos as filhas com FK corrigida depois.
    const childTables = (db.prepare(`
      SELECT DISTINCT m.name AS tbl
      FROM sqlite_master m
      JOIN pragma_foreign_key_list(m.name) fkl ON 1=1
      WHERE m.type = 'table'
        AND fkl."table" = 'novels'
        AND m.name != '_novels_old'
      ORDER BY m.name
    `).all() as Array<{ tbl: string }>).map((r) => r.tbl);

    console.log(`  → Tabelas filhas a serem preservadas: ${childTables.join(", ") || "(nenhuma)"}`);

    // Para cada tabela filha: CREATE TABLE _backup_X AS SELECT * FROM X
    // (preserva schema básico mas perde índices/FKs — vamos recriar tudo depois)
    for (const tbl of childTables) {
      const backupTbl = `_backup_${tbl}`;
      // Drop backup se existir de tentativa anterior
      db.exec(`DROP TABLE IF EXISTS ${backupTbl};`);
      db.exec(`CREATE TABLE ${backupTbl} AS SELECT * FROM ${tbl};`);
      const count = (db.prepare(`SELECT COUNT(*) as c FROM ${backupTbl}`).get() as any).c;
      console.log(`    ✓ ${tbl} → ${backupTbl} (${count} rows)`);
    }

    // ── PASSO B: renomeia novels → _novels_old ──
    db.exec(`ALTER TABLE novels RENAME TO _novels_old;`);

    // ── PASSO C: cria novels nova com CHECK expandido ──
    db.exec(`
      CREATE TABLE novels (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        alternative_titles TEXT DEFAULT '[]',
        synopsis TEXT NOT NULL DEFAULT '',
        cover_url TEXT,
        cover_source_url TEXT,
        cover_local_path TEXT,
        author_id TEXT NOT NULL,
        source TEXT,
        source_id TEXT,
        source_url TEXT,
        type TEXT NOT NULL DEFAULT 'light-novel' CHECK (type IN ('light-novel', 'web-novel', 'short', 'visual-novel')),
        status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus', 'dropped')),
        genres TEXT NOT NULL DEFAULT '[]',
        tags TEXT NOT NULL DEFAULT '[]',
        views INTEGER NOT NULL DEFAULT 0,
        rating_sum INTEGER NOT NULL DEFAULT 0,
        rating_count INTEGER NOT NULL DEFAULT 0,
        external_score REAL,
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_approved INTEGER NOT NULL DEFAULT 1,
        last_synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // ── PASSO D: copia dados antigos ──
    db.exec(`
      INSERT INTO novels (
        id, slug, title, alternative_titles, synopsis, cover_url,
        cover_source_url, cover_local_path,
        author_id, source, source_id, source_url,
        type, status, genres, tags,
        views, rating_sum, rating_count, external_score,
        is_featured, is_approved, last_synced_at,
        created_at, updated_at
      )
      SELECT
        id, slug, title, alternative_titles, synopsis, cover_url,
        NULL, NULL,
        author_id, NULL, NULL, NULL,
        type, status, genres, tags,
        views, rating_sum, rating_count, NULL,
        is_featured, is_approved, NULL,
        created_at, updated_at
      FROM _novels_old;
    `);

    // ── PASSO E: índices de novels ──
    db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_slug ON novels(slug);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_author ON novels(author_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_featured ON novels(is_featured);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_source ON novels(source, source_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_last_synced ON novels(last_synced_at);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_novels_external_score ON novels(external_score);`);

    // ── PASSO F: dropa _novels_old (agora seguro porque não há CASCADE ativo) ──
    db.exec(`DROP TABLE _novels_old;`);

    // ── PASSO G: recria tabelas filhas com FK corrigida → novels ──
    // Para cada tabela filha, recriamos a partir do schema original
    // (lido do _novels_old que existia antes — mas agora já foi dropado).
    // Workaround: recriamos manualmente cada tabela conhecida.
    for (const tbl of childTables) {
      // Drop tabela filha (agora pode ter FK inválida apontando pra _novels_old que não existe)
      db.exec(`DROP TABLE IF EXISTS ${tbl};`);
    }

    // ── Recria chapters (FK: novel_id → novels, volume_id → volumes) ──
    db.exec(`
      CREATE TABLE chapters (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        volume_id TEXT,
        chapter_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        word_count INTEGER NOT NULL DEFAULT 0,
        views INTEGER NOT NULL DEFAULT 0,
        source_url TEXT,
        published_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (novel_id, chapter_number),
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
        FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE SET NULL
      );
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chapters_volume ON chapters(volume_id);`);

    // ── Recria comments (FK: novel_id → novels, chapter_id → chapters) ──
    if (childTables.includes("comments")) {
      db.exec(`
        CREATE TABLE comments (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL,
          chapter_id TEXT,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          is_hidden INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
        );
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_chapter ON comments(chapter_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_novel ON comments(novel_id);`);
    }

    // ── Recria favorites (FK: novel_id → novels) ──
    if (childTables.includes("favorites")) {
      db.exec(`
        CREATE TABLE favorites (
          user_id TEXT NOT NULL,
          novel_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, novel_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
        );
      `);
    }

    // ── Recria reading_progress (FK: novel_id → novels, chapter_id → chapters) ──
    if (childTables.includes("reading_progress")) {
      db.exec(`
        CREATE TABLE reading_progress (
          user_id TEXT NOT NULL,
          chapter_id TEXT NOT NULL,
          novel_id TEXT NOT NULL,
          progress INTEGER NOT NULL DEFAULT 0,
          last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, chapter_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
        );
      `);
    }

    // ── Recria source_links (FK: novel_id → novels, source_id → sources) ──
    if (childTables.includes("source_links")) {
      db.exec(`
        CREATE TABLE source_links (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL,
          source_id TEXT NOT NULL,
          external_id TEXT NOT NULL,
          external_url TEXT,
          match_confidence REAL NOT NULL DEFAULT 1.0,
          last_synced_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (source_id, external_id),
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
          FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
        );
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_source_links_novel ON source_links(novel_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_source_links_source ON source_links(source_id, external_id);`);
    }

    // ── Recria volumes (FK: novel_id → novels) ──
    if (childTables.includes("volumes")) {
      db.exec(`
        CREATE TABLE volumes (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL,
          volume_number REAL NOT NULL,
          title TEXT,
          status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
          chapter_count INTEGER NOT NULL DEFAULT 0,
          source_url TEXT,
          last_synced_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (novel_id, volume_number),
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
        );
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_novel ON volumes(novel_id);`);
    }

    // ── Recria novel_tags (FK: novel_id → novels, tag_id → tags) ──
    if (childTables.includes("novel_tags")) {
      db.exec(`
        CREATE TABLE novel_tags (
          novel_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (novel_id, tag_id),
          FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
      `);
    }

    // ── PASSO H: restaura dados das tabelas filhas ──
    for (const tbl of childTables) {
      const backupTbl = `_backup_${tbl}`;
      // Detecta colunas comuns entre backup e tabela nova
      const backupCols = (db.prepare(`PRAGMA table_info(${backupTbl})`).all() as any[]).map((c) => c.name);
      const newCols = (db.prepare(`PRAGMA table_info(${tbl})`).all() as any[]).map((c) => c.name);
      const commonCols = backupCols.filter((c) => newCols.includes(c));

      if (commonCols.length > 0) {
        const colList = commonCols.join(", ");
        db.exec(`INSERT INTO ${tbl} (${colList}) SELECT ${colList} FROM ${backupTbl};`);
        const restored = (db.prepare(`SELECT COUNT(*) as c FROM ${tbl}`).get() as any).c;
        console.log(`    ✓ ${tbl}: ${restored} rows restauradas (de ${backupTbl})`);
      } else {
        console.log(`    ! ${tbl}: nenhuma coluna em comum com ${backupTbl}, pulando`);
      }

      // Drop backup
      db.exec(`DROP TABLE ${backupTbl};`);
    }

    // NOTA: foreign_keys=ON é restaurado pelo runner DEPOIS do db.transaction().

    console.log("  ✓ Tabela novels recriada + todas as FKs e dados preservados");
  } else {
    console.log("  ✓ CHECK de novels.type já inclui 'visual-novel' (idempotente)");
  }

  // ── 4. Tabela `sources` (registro de fontes externas) ───────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('api', 'scrape')),
      base_url TEXT,
      rate_limit_per_sec REAL NOT NULL DEFAULT 1.0,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      last_run_status TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── 5. Tabela `source_links` (deduplicação: mesma obra em múltiplas fontes) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_links (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL,
      external_url TEXT,
      match_confidence REAL NOT NULL DEFAULT 1.0,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source_id, external_id),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_source_links_novel ON source_links(novel_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_source_links_source ON source_links(source_id, external_id);`);

  // ── 6. Tabela `volumes` (volumes de light novel) ───────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS volumes (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      volume_number REAL NOT NULL,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
      chapter_count INTEGER NOT NULL DEFAULT 0,
      source_url TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (novel_id, volume_number),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_volumes_novel ON volumes(novel_id);`);

  // ── 7. Tabela `tags` (taxonomia normalizada) ───────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('genre', 'tag', 'theme')),
      source TEXT,
      external_id TEXT,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);`);

  // ── 8. Tabela `novel_tags` (many-to-many) ──────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS novel_tags (
      novel_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (novel_id, tag_id),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // ── 9. Tabela `sync_runs` (log de cada execução de sincronização) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      source_name TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('initial', 'weekly', 'daily', 'manual')),
      status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      duration_ms INTEGER,
      items_found INTEGER NOT NULL DEFAULT 0,
      items_imported INTEGER NOT NULL DEFAULT 0,
      items_updated INTEGER NOT NULL DEFAULT 0,
      items_skipped INTEGER NOT NULL DEFAULT 0,
      items_failed INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_runs_source ON sync_runs(source_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON sync_runs(status);`);

  // ── 10. Tabela `sync_errors` (erros de cada run) ───────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_errors (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      external_id TEXT,
      error_type TEXT,
      error_message TEXT NOT NULL,
      stack_trace TEXT,
      context TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES sync_runs(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_errors_run ON sync_errors(run_id);`);

  // ── 11. Tabela `chapters` ganha source_url (pra link externo) ──────
  const chapterCols = db.prepare("PRAGMA table_info(chapters)").all() as Array<{ name: string }>;
  const existingChapCols = new Set(chapterCols.map((c) => c.name));
  if (!existingChapCols.has("source_url")) {
    db.exec(`ALTER TABLE chapters ADD COLUMN source_url TEXT;`);
    console.log("  ✓ chapters.source_url adicionada");
  }
  if (!existingChapCols.has("volume_id")) {
    db.exec(`ALTER TABLE chapters ADD COLUMN volume_id TEXT;`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chapters_volume ON chapters(volume_id);`);
    console.log("  ✓ chapters.volume_id adicionada");
  }

  // ── 12. Marca esta migration como aplicada ─────────────────────────
  db.prepare(`INSERT OR REPLACE INTO migrations (name) VALUES (?)`).run(name);
}

export function down(_db: Database.Database): void {
  // Down migration: por segurança, NÃO removemos colunas/tabelas.
  // O usuário pode reverter manualmente se precisar.
  // Apenas removemos o registro desta migration.
  _db.prepare(`DELETE FROM migrations WHERE name = ?`).run(name);
}
