/**
 * Preenche capítulos faltantes nos mangás já importados.
 *
 * Para cada mangá no DB:
 *   - Detecta até que chapter_number está
 *   - Importa mais N capítulos a partir dali
 *
 * Uso:
 *   npx tsx scripts/fill-manga-chapters.ts --per-manga=30
 */

import Database from "better-sqlite3";
import { importManga } from "../src/lib/manga/adapters/mangaonline";

function ts() {
  return new Date().toLocaleTimeString("pt-BR");
}

async function main() {
  const argv = process.argv.slice(2);
  let perManga = 20;
  let limit: number | null = null;
  let skipExisting = true;
  for (const a of argv) {
    if (a.startsWith("--per-manga=")) perManga = parseInt(a.split("=")[1], 10);
    else if (a.startsWith("--limit=")) limit = parseInt(a.split("=")[1], 10);
    else if (a === "--no-skip") skipExisting = false;
  }

  const c = new Database("data/tomoverso.db");
  const mangas = c
    .prepare(
      `SELECT slug, source_id, (SELECT MAX(chapter_number) FROM manga_chapters WHERE manga_id = mangas.id) AS max_chapter
       FROM mangas WHERE source = ? ORDER BY updated_at DESC`
    )
    .all("mangaonline.blue") as Array<{ slug: string; source_id: string; max_chapter: number | null }>;

  const targets = mangas.slice(0, limit ?? mangas.length);

  console.log(`\n[${ts()}] Preenchendo +${perManga} capítulos em ${targets.length} mangás (skipExisting=${skipExisting})\n`);

  let totalAdded = 0;
  let totalErr = 0;
  let processed = 0;

  for (const m of targets) {
    processed++;
    const startFrom = (m.max_chapter ?? 0) + 1;
    try {
      const r = await importManga(m.source_id, {
        maxChapters: perManga,
        startFromChapter: startFrom,
        skipExistingPages: skipExisting,
        onProgress: () => {}, // silencioso
      });
      totalAdded += r.chaptersAdded + r.pagesAdded;
      if (r.errors.length > 0) totalErr++;
      if (processed % 20 === 0) {
        console.log(`[${ts()}] [${processed}/${targets.length}] Processados ${processed} mangás`);
      }
    } catch (e: any) {
      console.error(`[${ts()}] ✗ ${m.slug}: ${e.message}`);
      totalErr++;
    }
  }

  console.log(`\n[${ts()}] === RESUMO ===`);
  console.log(`  Mangás processados: ${processed}`);
  console.log(`  Capítulos+páginas adicionados: ${totalAdded}`);
  console.log(`  Mangás com erro: ${totalErr}`);
  process.exit(totalErr > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});