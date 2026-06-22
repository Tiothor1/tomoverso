/**
 * Repair — busca capas faltantes em novels MangaDex.
 *
 * Quando o bug do .set()/.append() existiu, 425 Mangas foram importados
 * sem cover_url. Este script refaz a busca de capa pra esses registros.
 *
 * Uso: npx tsx scripts/repair-md-covers.ts
 */

import Database from "better-sqlite3";
import { HttpClient } from "../src/lib/ingest";
import * as path from "path";

async function main() {
  const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"));
  const client = new HttpClient({
    userAgent: "Tomoverso-Repair/1.0",
    timeoutMs: 15000,
    maxRetries: 2,
  });

  // Seleciona todos MangaDex com cover_url NULL
  const novels = db.prepare(`
    SELECT id, slug, source_id FROM novels
    WHERE source = 'mangadex' AND (cover_url IS NULL OR cover_url = '')
  `).all() as Array<{ id: string; slug: string; source_id: string }>;

  console.log(`Encontrei ${novels.length} Mangas sem capa.\n`);

  if (novels.length === 0) {
    console.log("Nada pra fazer.");
    db.close();
    return;
  }

  let fixed = 0;
  let failed = 0;
  const startTime = Date.now();

  // MangaDex rate limit: 5 req/s → espera 200ms entre chamadas
  const updateStmt = db.prepare(`UPDATE novels SET cover_url = ?, cover_source_url = ? WHERE id = ?`);

  for (let i = 0; i < novels.length; i++) {
    const n = novels[i];
    try {
      const url = `https://api.mangadex.org/manga/${n.source_id}?includes[]=cover_art`;
      const r = await client.get<{ data: any }>(url);
      const coverRel = r.data.data.relationships?.find((rel: any) => rel.type === "cover_art");
      const fileName = coverRel?.attributes?.fileName;

      if (fileName) {
        const coverUrl = `https://uploads.mangadex.org/covers/${n.source_id}/${fileName}`;
        updateStmt.run(coverUrl, coverUrl, n.id);
        fixed++;
        if (fixed <= 3 || fixed % 50 === 0) {
          console.log(`  ✓ ${fixed}: ${n.slug}`);
        }
      } else {
        failed++;
      }

      // Rate limit: 200ms entre chamadas
      await new Promise((resolve) => setTimeout(resolve, 200));

      if ((i + 1) % 50 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`  Progresso: ${i + 1}/${novels.length} | elapsed: ${elapsed.toFixed(1)}s | fixed: ${fixed} | failed: ${failed}`);
      }
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${n.slug}: ${e.message}`);
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n=== RESULTADO ===`);
  console.log(`  Total: ${novels.length}`);
  console.log(`  Capas recuperadas: ${fixed}`);
  console.log(`  Falhas: ${failed}`);
  console.log(`  Duração: ${elapsed.toFixed(2)}s`);

  db.close();
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
