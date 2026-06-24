/**
 * Migration 002 — Fundação de mangá
 *
 * Adiciona tabelas para a feature de mangá do Tomoverso:
 *
 * - mangas: obras de mangá (separado de novels pra não conflitar com CHECK de type)
 *   - title, slug, alternative_titles, synopsis, cover_url, author, artist
 *   - status (ongoing/completed/hiatus/dropped)
 *   - source/source_id (rastreio da fonte: mangaonline.blue, centralnovel.com, etc)
 *   - source_url, last_synced_at
 *
 * - manga_chapters: capítulos de cada mangá
 *   - manga_id, chapter_number, title, slug, published_at
 *
 * - manga_pages: páginas (imagens) de cada capítulo
 *   - chapter_id, page_number, image_url, local_path, width, height
 *
 * - manga_genres / manga_tags: tags livres (sem taxonomia por enquanto)
 *
 * Design: NÃO usa FK para novels (mangá é entidade separada). Garante que
 * se um mangá for deletado, capítulos/páginas vão junto (CASCADE).
 */

import type Database from "better-sqlite3";

export const name = "002_manga_foundation";
export const requiresForeignKeysOff = false;

export function up(db: Database.Database): void {
  // ── 1. Tabela `mangas` ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS mangas (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      alternative_titles TEXT NOT NULL DEFAULT '[]',  -- JSON array
      synopsis TEXT NOT NULL DEFAULT '',
      cover_url TEXT,
      cover_local_path TEXT,
      author TEXT,
      artist TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing'
        CHECK (status IN ('ongoing', 'completed', 'hiatus', 'dropped')),
      source TEXT,         -- 'mangaonline.blue', 'centralnovel', 'mangadex'
      source_id TEXT,      -- slug ou ID na fonte
      source_url TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_mangas_slug ON mangas(slug);
    CREATE INDEX IF NOT EXISTS idx_mangas_source ON mangas(source, source_id);
    CREATE INDEX IF NOT EXISTS idx_mangas_status ON mangas(status);
  `);

  // ── 2. Tabela `manga_chapters` ───────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga_chapters (
      id TEXT PRIMARY KEY,
      manga_id TEXT NOT NULL,
      chapter_number REAL NOT NULL,  -- REAL pra suportar 12.5 (capítulos especiais)
      title TEXT,
      slug TEXT NOT NULL,             -- URL slug do capítulo
      source_url TEXT,
      page_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
      UNIQUE (manga_id, chapter_number)
    );

    CREATE INDEX IF NOT EXISTS idx_manga_chapters_manga ON manga_chapters(manga_id, chapter_number);
    CREATE INDEX IF NOT EXISTS idx_manga_chapters_slug ON manga_chapters(manga_id, slug);
  `);

  // ── 3. Tabela `manga_pages` ──────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga_pages (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      image_url TEXT NOT NULL,        -- URL original (CDN da fonte)
      local_path TEXT,                -- /uploads/mangas/... se baixado
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chapter_id) REFERENCES manga_chapters(id) ON DELETE CASCADE,
      UNIQUE (chapter_id, page_number)
    );

    CREATE INDEX IF NOT EXISTS idx_manga_pages_chapter ON manga_pages(chapter_id, page_number);
  `);

  // ── 4. Tags livres (sem taxonomia — array JSON igual novels) ─────────
  // Pra simplicidade, guardamos tags como JSON em coluna da própria `mangas`
  // e adicionamos uma view materializada de tags populares.
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manga_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
      UNIQUE (manga_id, tag)
    );
    CREATE INDEX IF NOT EXISTS idx_manga_tags_tag ON manga_tags(tag);
  `);

  // ── 5. Tracking de importações ───────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS manga_import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      manga_slug TEXT NOT NULL,
      status TEXT NOT NULL,           -- 'started' | 'success' | 'partial' | 'failed'
      pages_imported INTEGER DEFAULT 0,
      chapters_imported INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_manga_import_log_slug ON manga_import_log(manga_slug);
  `);

  console.log("  ✓ Migration 002 — manga_foundation aplicada");
}

export function down(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS manga_import_log;
    DROP TABLE IF EXISTS manga_tags;
    DROP TABLE IF EXISTS manga_pages;
    DROP TABLE IF EXISTS manga_chapters;
    DROP TABLE IF EXISTS mangas;
  `);
  console.log("  ✓ Migration 002 — revertida");
}