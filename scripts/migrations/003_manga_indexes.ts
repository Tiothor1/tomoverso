/**
 * Migration 003 — Otimiza manga queries com índices.
 * Sem tabelas novas, só índices pra acelerar as queries.
 */
import type Database from "better-sqlite3";
export const name = "003_manga_indexes";
export const requiresForeignKeysOff = false;

export function up(db: Database.Database): void {
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_manga_chapters_manga_pages ON manga_chapters(manga_id) INCLUDE (page_count)",
    "CREATE INDEX IF NOT EXISTS idx_manga_pages_chapter_pages ON manga_pages(chapter_id) INCLUDE (page_number, image_url)",
    "CREATE INDEX IF NOT EXISTS idx_manga_tags_manga ON manga_tags(manga_id)",
    // Already exists but ensure coverage
    "CREATE INDEX IF NOT EXISTS idx_manga_chapters_manga_num ON manga_chapters(manga_id, chapter_number)",
  ];
  for (const sql of indexes) {
    try {
      db.exec(sql);
    } catch {
      // ignore if already exists or unsupported
    }
  }
  console.log("  ✓ Migration 003 — manga indexes applied");
}

export function down(db: Database.Database): void {
  // no-op for indexes
}
