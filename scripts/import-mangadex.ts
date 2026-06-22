/**
 * CLI — Importa obras do MangaDex.
 *
 * Uso:
 *   npx tsx scripts/import-mangadex.ts [--limit=500]
 *
 * Padrão: top 500 por followedCount (popularidade).
 * Tempo esperado: ~30s a 5 req/s (limit=100/página = 5 páginas).
 */

import { randomUUID } from "crypto";
import {
  MangaDexAdapter,
  upsertNovel,
  upsertSource,
  SyncLogger,
  type UpsertResult,
} from "../src/lib/ingest";

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 500;
  for (const arg of args) {
    if (arg.startsWith("--limit=")) limit = parseInt(arg.slice("--limit=".length), 10);
  }
  limit = Math.max(1, Math.min(limit, 5000));
  return { limit };
}

async function main() {
  const { limit } = parseArgs();
  const startTime = Date.now();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  IMPORT MANGADEX → Tomoverso               ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`  Limite: ${limit} obras`);
  console.log(`  Início: ${new Date().toISOString()}\n`);

  const adapter = new MangaDexAdapter();
  const requestedId = randomUUID();
  const sourceId = upsertSource({
    id: requestedId,
    name: "mangadex",
    displayName: adapter.displayName,
    type: adapter.type,
    baseUrl: adapter.baseUrl,
    rateLimitPerSec: adapter.rateLimitPerSec,
    config: { source: "https://api.mangadex.org" },
  });
  console.log(`✓ Source 'mangadex' registrada (id=${sourceId})\n`);

  const logger = new SyncLogger({
    sourceId,
    sourceName: "mangadex",
    mode: "initial",
    metadata: { limit, started_at: new Date().toISOString() },
    consoleLogger: {
      info: (m, ...a) => console.log(`  ${m}`, ...a),
      warn: (m, ...a) => console.warn(`  ⚠ ${m}`, ...a),
      error: (m, ...a) => console.error(`  ✗ ${m}`, ...a),
    },
  });

  let cursor: string | null | undefined = undefined;
  let imported = 0, updated = 0, duplicates = 0, failed = 0;
  const seen = new Set<string>();
  const pageSize = 100;

  while (imported + updated + duplicates + failed < limit) {
    const remaining = limit - imported - updated - duplicates - failed;
    const currentLimit = Math.min(pageSize, remaining);

    let page;
    try {
      page = await adapter.listNovels({ cursor, limit: currentLimit });
    } catch (e: any) {
      logger.logError({ errorType: "PaginationError", error: e, context: { cursor } });
      console.error(`  Falha na paginação: ${e.message}`);
      break;
    }

    if (page.items.length === 0) {
      console.log("  Página vazia — fim da paginação.");
      break;
    }

    logger.incFound(page.items.length);
    console.log(`\n→ Offset ${cursor ?? 0}: ${page.items.length} obras`);

    for (const m of page.items) {
      if (seen.has(m.externalId)) continue;
      seen.add(m.externalId);

      try {
        const result: UpsertResult = upsertNovel(m, { sourceId, sourceName: "mangadex" });
        switch (result.outcome) {
          case "imported":
            imported++;
            logger.incImported();
            console.log(`  + [${m.externalId.slice(0, 8)}] ${m.title} (${m.type})`);
            break;
          case "updated":
            updated++;
            logger.incUpdated();
            break;
          case "duplicate":
            duplicates++;
            logger.incSkipped();
            console.log(`  = [${m.externalId.slice(0, 8)}] ${m.title} (dup)`);
            break;
          default:
            failed++;
            logger.incFailed();
        }
      } catch (e: any) {
        failed++;
        logger.logError({
          externalId: m.externalId,
          errorType: "UpsertError",
          error: e,
          context: { title: m.title },
        });
      }
    }

    const total = imported + updated + duplicates + failed;
    const elapsed = (Date.now() - startTime) / 1000;
    const eta = total / elapsed > 0 ? Math.ceil((limit - total) / (total / elapsed)) : 0;
    console.log(`  📊 Total: ${total}/${limit} | elapsed: ${elapsed.toFixed(1)}s | ETA: ${eta}s`);

    cursor = page.nextCursor;
    if (!cursor) break;
  }

  const summary = logger.finish();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  RESUMO DO IMPORT MANGADEX                  ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`  Status:       ${summary.status}`);
  console.log(`  Encontradas:  ${summary.itemsFound}`);
  console.log(`  Importadas:   ${summary.itemsImported}`);
  console.log(`  Atualizadas:  ${summary.itemsUpdated}`);
  console.log(`  Duplicatas:   ${summary.itemsSkipped}`);
  console.log(`  Falharam:     ${summary.itemsFailed}`);
  console.log(`  Duração:      ${(summary.durationMs / 1000).toFixed(2)}s`);

  process.exit(summary.status === "failed" ? 1 : 0);
}

main().catch((e) => {
  console.error("\nERRO FATAL:", e);
  process.exit(1);
});
