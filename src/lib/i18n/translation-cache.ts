import { createHash } from "crypto";
import type { getDb } from "@/lib/db";

type Db = ReturnType<typeof getDb>;

export function ensureTranslationsTable(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      source_locale TEXT NOT NULL DEFAULT 'pt-BR',
      target_locale TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      provider TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(entity_type, entity_id, field_name, target_locale, source_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_translations_lookup
      ON translations(entity_type, entity_id, field_name, target_locale);
    CREATE INDEX IF NOT EXISTS idx_translations_locale_status
      ON translations(target_locale, status);
  `);
}

export function hashText(text: string): string {
  return createHash("md5").update(text).digest("hex");
}
