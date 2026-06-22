/**
 * Expande o seed com capítulos adicionais do mock-novels.ts.
 * - Adiciona capítulos 2 e 3 de OQEDE (que estão no mock mas não no seed)
 * - Atualiza o tomoverso.seed.db
 *
 * Rodar com: npx tsx scripts/expand-seed.ts
 */

import Database from "better-sqlite3";
import * as path from "path";
import { mockChapters } from "../src/lib/data/mock-novels";

async function main() {
  const dbPath = path.join(process.cwd(), "data", "tomoverso.seed.db");
  const db = new Database(dbPath);

  console.log("=== Capítulos existentes por novel ===");
  const existing = db.prepare(`
    SELECT n.slug, n.title, COUNT(c.id) as chapters
    FROM novels n LEFT JOIN chapters c ON c.novel_id = n.id
    WHERE n.author_id = (SELECT id FROM users WHERE username = 'fabio_tx')
    GROUP BY n.id, n.slug, n.title
  `).all() as any[];
  for (const r of existing) {
    console.log(`  ${r.slug}: ${r.chapters} capítulos`);
  }

  console.log("\n=== Adicionando capítulos do mock ===");
  const insert = db.prepare(`
    INSERT OR IGNORE INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let added = 0;
  let skipped = 0;
  for (const ch of mockChapters) {
    const result = insert.run(
      ch.id,
      ch.novel_id,
      ch.chapter_number,
      ch.title,
      ch.content,
      ch.word_count,
      ch.published_at
    );
    if (result.changes > 0) {
      added++;
      console.log(`  + ${ch.id} (cap ${ch.chapter_number}, ${ch.word_count} palavras)`);
    } else {
      skipped++;
    }
  }
  console.log(`\nAdicionados: ${added} | Já existiam: ${skipped}`);

  // Mostra estado final
  console.log("\n=== Estado final ===");
  for (const r of db.prepare(`
    SELECT n.slug, n.title, COUNT(c.id) as chapters, SUM(c.word_count) as words
    FROM novels n LEFT JOIN chapters c ON c.novel_id = n.id
    WHERE n.author_id = (SELECT id FROM users WHERE username = 'fabio_tx')
    GROUP BY n.id, n.slug, n.title
  `).all() as any[]) {
    console.log(`  ${r.slug}: ${r.chapters} capítulos, ${r.words} palavras totais (~${Math.round((r.words || 0) / 250)} min de leitura)`);
  }

  // Checkpoint pra consolidar no main file
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();
  console.log("\n✓ Seed atualizado em " + dbPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
