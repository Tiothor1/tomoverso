/**
 * Syosetu Content Scraper — baixa capítulos reais de novels.
 *
 * Syosetu (https://syosetu.com) é a maior plataforma de web novels do
 * Japão, com conteúdo textual público e gratuito. Muitas light novels
 * famosas começaram aqui (Re:Zero, Mushoku Tensei, Overlord, etc.)
 *
 * Fluxo:
 * 1. Pega novels JP do DB (sem capítulos ou com poucos)
 * 2. Busca cada uma no Syosetu por título
 * 3. Se encontrar, baixa primeiros N capítulos
 * 4. Salva no chapters table
 */

import Database from "better-sqlite3";
import * as path from "path";
import { randomUUID } from "crypto";
import { HttpClient } from "../src/lib/ingest";
import { upsertSource, SyncLogger } from "../src/lib/ingest";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"));
  const client = new HttpClient({
    userAgent: "Tomoverso-Content/1.0 (syosetu content fetcher)",
    timeoutMs: 15000,
    maxRetries: 2,
  });

  // Registra source no DB
  const sourceId = upsertSource({
    id: randomUUID(),
    name: "syosetu",
    displayName: "Syosetu (Conteúdo)",
    type: "scrape",
    baseUrl: "https://syosetu.com",
    rateLimitPerSec: 2,
    config: { source: "https://yomou.syosetu.com" },
  });
  console.log(`✓ Source syosetu registrada (id=${sourceId.slice(0,8)}...)`);

  const logger = new SyncLogger({
    sourceId,
    sourceName: "syosetu",
    mode: "initial",
    metadata: { action: "download_chapters" },
  });

  // Seleciona novels JP sem capítulos (ou com 0)
  const novels = db.prepare(`
    SELECT n.id, n.slug, n.title, n.source, n.source_id
    FROM novels n
    WHERE n.type IN ('light-novel', 'web-novel')
      AND (n.id NOT IN (SELECT novel_id FROM chapters) OR n.id IN (
        SELECT novel_id FROM chapters GROUP BY novel_id HAVING COUNT(*) < 3
      ))
    ORDER BY n.external_score DESC NULLS LAST
    LIMIT 200
  `).all() as Array<{ id: string; slug: string; title: string; source: string; source_id: string }>;

  console.log(`\nEncontrei ${novels.length} novels pra buscar conteúdo.\n`);

  let mapped = 0, failedMap = 0;

  for (let i = 0; i < Math.min(novels.length, 50); i++) {  // Começa com 50
    const n = novels[i];
    const startTime = Date.now();

    // 1) Busca no Syosetu
    const searchUrl = `https://yomou.syosetu.com/search.php?word=${encodeURIComponent(n.title.slice(0, 60))}`;

    try {
      await sleep(500); // rate limit 2 req/s
      const searchRes = await client.get<string>(searchUrl);

      // Extrai ncode do HTML
      const ncodeMatch = searchRes.data.match(/ncode\.syosetu\.com\/([a-z0-9]+)\//);
      if (!ncodeMatch) {
        failedMap++;
        logger.incFailed();
        process.stdout.write(`  ✗ [${i+1}/${novels.length}] ${n.title.slice(0, 30)}... — não encontrado\n`);
        continue;
      }

      const ncode = ncodeMatch[1];
      process.stdout.write(`  ✓ [${i+1}/${novels.length}] ${n.title.slice(0, 30).padEnd(32)} → ${ncode}\n`);
      logger.incFound();

      // 2) Baixa página da novel pra extrair lista de capítulos
      const novelUrl = `https://ncode.syosetu.com/${ncode}/`;
      await sleep(300);
      const novelRes = await client.get<string>(novelUrl);

      // Extrai capítulos (máximo 20)
      const chapterLinks: Array<{num: number; title: string}> = [];
      const regex = /href="\/([a-z0-9]+\/(\d+))\/"[^>]*>([^<]+)</g;
      let match;
      while ((match = regex.exec(novelRes.data)) !== null && chapterLinks.length < 20) {
        if (match[2] && match[3]) {
          const num = parseInt(match[2], 10);
          if (!isNaN(num) && num >= 1 && num <= 9999) {
            chapterLinks.push({ num, title: match[3].trim() });
          }
        }
      }

      if (chapterLinks.length === 0) {
        failedMap++;
        process.stdout.write(`    → 0 capítulos encontrados\n`);
        continue;
      }

      // 3) Baixa cada capítulo
      let chaptersAdded = 0;
      for (const ch of chapterLinks.slice(0, 10)) { // máximo 10 por novel
        await sleep(500); // 2 req/s
        try {
          const chUrl = `https://ncode.syosetu.com/${ncode}/${ch.num}/`;
          const chRes = await client.get<string>(chUrl);

          // Extrai conteúdo do capítulo
          const contentMatch = chRes.data.match(/<div id="novel_honbun"[^>]*>([\s\S]*?)<\/div>/);
          if (!contentMatch) continue;

          let content = contentMatch[1]
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

          if (content.length < 50) continue; // capítulo vazio

          // Verifica se já existe
          const existing = db.prepare(
            "SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?"
          ).get(n.id, ch.num);
          if (existing) continue;

          // Insere capítulo
          db.prepare(`
            INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at, source_url)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
          `).run(
            randomUUID(),
            n.id,
            ch.num,
            ch.title || `Capítulo ${ch.num}`,
            content.slice(0, 100000),
            content.split(/\s+/).filter(Boolean).length,
            chUrl
          );

          chaptersAdded++;
          logger.incImported();
        } catch (e: any) {
          process.stdout.write(`    ✗ cap ${ch.num}: ${e.message.slice(0, 50)}\n`);
          logger.incFailed();
        }
      }

      mapped++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`    → +${chaptersAdded} capítulos em ${elapsed}s\n`);

    } catch (e: any) {
      failedMap++;
      process.stdout.write(`  ✗ [${i+1}/${novels.length}] ${n.title.slice(0, 30)}... — ${e.message.slice(0, 80)}\n`);
      logger.incFailed();
    }
  }

  console.log(`\n=== RESUMO ===`);
  const summary = logger.finish();
  console.log(`  Buscadas: ${summary.itemsFound + failedMap}`);
  console.log(`  Encontradas (com matching): ${summary.itemsFound}`);
  console.log(`  Capítulos importados: ${summary.itemsImported}`);
  console.log(`  Falhas: ${summary.itemsFailed}`);
  console.log(`  Duração: ${(summary.durationMs / 1000).toFixed(1)}s`);

  db.close();
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
