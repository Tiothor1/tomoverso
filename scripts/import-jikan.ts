/**
 * CLI — Importa Light Novels + Novels do JIKAN (MAL).
 *
 * Uso:
 *   npx tsx scripts/import-jikan.ts [--limit=500] [--type=both]
 *
 * type=both  → lightnovel + novel (default)
 * type=lightnovel → só light novels publicadas em formato livro
 * type=novel → só novels (inclui web novels)
 *
 * Padrão: top 500 LNs por score (50 obras por página, 10 páginas).
 * Tempo esperado: ~10-15 min a 2 req/s.
 */

import { randomUUID } from "crypto";
import {
  JikanAdapter,
  upsertNovel,
  upsertSource,
  SyncLogger,
  type UpsertResult,
} from "../src/lib/ingest";

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 500;
  let type: "lightnovel" | "novel" | "both" = "both";

  for (const arg of args) {
    if (arg.startsWith("--limit=")) limit = parseInt(arg.slice("--limit=".length), 10);
    else if (arg === "--type=lightnovel") type = "lightnovel";
    else if (arg === "--type=novel") type = "novel";
    else if (arg === "--type=both") type = "both";
  }

  limit = Math.max(1, Math.min(limit, 5000));
  return { limit, type };
}

async function main() {
  const { limit, type } = parseArgs();
  const startTime = Date.now();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  IMPORT JIKAN (MAL) → Tomoverso            ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`  Limite: ${limit} obras`);
  console.log(`  Tipo: ${type}`);
  console.log(`  Início: ${new Date().toISOString()}\n`);

  const adapter = new JikanAdapter({ mangaType: type });

  const requestedSourceId = randomUUID();
  const sourceId = upsertSource({
    id: requestedSourceId,
    name: "jikan",
    displayName: adapter.displayName,
    type: adapter.type,
    baseUrl: adapter.baseUrl,
    rateLimitPerSec: adapter.rateLimitPerSec,
    config: { source: "https://api.jikan.moe/v4", mangaType: type },
  });
  console.log(`✓ Source 'jikan' registrada (id=${sourceId})\n`);

  const logger = new SyncLogger({
    sourceId,
    sourceName: "jikan",
    mode: "initial",
    metadata: { limit, type, started_at: new Date().toISOString() },
    consoleLogger: {
      info: (msg, ...args) => console.log(`  ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`  ⚠ ${msg}`, ...args),
      error: (msg, ...args) => console.error(`  ✗ ${msg}`, ...args),
    },
  });

  let cursor: string | null | undefined = undefined;
  let imported = 0, updated = 0, duplicates = 0, failed = 0;
  const seen = new Set<string>();

  // 50 obras por página (25 lightnovel + 25 novel)
  const pageSize = type === "both" ? 50 : 25;

  while (imported + updated + duplicates + failed < limit) {
    const remaining = limit - imported - updated - duplicates - failed;
    const currentLimit = Math.min(pageSize, remaining);

    let page;
    try {
      page = await adapter.listNovels({ cursor, limit: currentLimit });
    } catch (e: any) {
      logger.logError({
        errorType: "PaginationError",
        error: e,
        context: { cursor, limit: currentLimit },
      });
      console.error(`  Falha ao buscar página: ${e.message}`);
      break;
    }

    if (page.items.length === 0) {
      console.log("  Página vazia — fim da paginação.");
      break;
    }

    logger.incFound(page.items.length);
    console.log(`\n→ Página ${cursor ?? 1}: ${page.items.length} obras`);

    for (const ln of page.items) {
      if (seen.has(ln.externalId)) continue;
      seen.add(ln.externalId);

      try {
        const result: UpsertResult = upsertNovel(ln, {
          sourceId,
          sourceName: "jikan",
        });
        switch (result.outcome) {
          case "imported":
            imported++;
            logger.incImported();
            console.log(`  + [${ln.externalId}] ${ln.title} (score: ${ln.score?.toFixed(2) ?? "?"})`);
            break;
          case "updated":
            updated++;
            logger.incUpdated();
            break;
          case "duplicate":
            duplicates++;
            logger.incSkipped();
            console.log(`  = [${ln.externalId}] ${ln.title} (dup)`);
            break;
          default:
            failed++;
            logger.incFailed();
        }
      } catch (e: any) {
        failed++;
        logger.logError({
          externalId: ln.externalId,
          errorType: "UpsertError",
          error: e,
          context: { title: ln.title },
        });
        console.error(`  ✗ [${ln.externalId}] ${ln.title}: ${e.message}`);
      }
    }

    const total = imported + updated + duplicates + failed;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = total / elapsedSec;
    const eta = rate > 0 ? Math.ceil((limit - total) / rate) : 0;
    console.log(`  📊 Total: ${total}/${limit} | elapsed: ${elapsedSec.toFixed(1)}s | ETA: ${eta}s`);

    cursor = page.nextCursor;
    if (!cursor) break;
  }

  const summary = logger.finish();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  RESUMO DO IMPORT JIKAN                     ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`  Status:       ${summary.status}`);
  console.log(`  Encontradas:  ${summary.itemsFound}`);
  console.log(`  Importadas:   ${summary.itemsImported}`);
  console.log(`  Atualizadas:  ${summary.itemsUpdated}`);
  console.log(`  Duplicatas:   ${summary.itemsSkipped}`);
  console.log(`  Falharam:     ${summary.itemsFailed}`);
  console.log(`  Duração:      ${(summary.durationMs / 1000).toFixed(2)}s`);
  console.log(`  Run ID:       ${summary.runId}`);

  process.exit(summary.status === "failed" ? 1 : 0);
}

main().catch((e) => {
  console.error("\nERRO FATAL:", e);
  process.exit(1);
});
