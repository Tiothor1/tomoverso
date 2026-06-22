/**
 * CLI — Importa Light Novels do AniList (GraphQL).
 *
 * Uso:
 *   npx tsx scripts/import-anilist.ts [--limit=300]
 *
 * Padrão: top 300 LNs por popularidade (6 páginas de 50).
 * Tempo esperado: ~30s a 2 req/s.
 *
 * Pra ter rate-limit maior, defina ANILIST_TOKEN no env
 * (free em https://anilist.co/settings/developer)
 */

import { randomUUID } from "crypto";
import {
  AniListAdapter,
  upsertNovel,
  upsertSource,
  SyncLogger,
  type UpsertResult,
} from "../src/lib/ingest";

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 300;
  for (const arg of args) {
    if (arg.startsWith("--limit=")) limit = parseInt(arg.slice("--limit=".length), 10);
  }
  limit = Math.max(1, Math.min(limit, 2000));
  return { limit };
}

async function main() {
  const { limit } = parseArgs();
  const startTime = Date.now();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  IMPORT ANILIST → Tomoverso                ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`  Limite: ${limit} obras`);
  console.log(`  Token: ${process.env.ANILIST_TOKEN ? "presente" : "(sem — vai pegar 90 req/min)"}`);
  console.log(`  Início: ${new Date().toISOString()}\n`);

  const adapter = new AniListAdapter();
  const requestedId = randomUUID();
  const sourceId = upsertSource({
    id: requestedId,
    name: "anilist",
    displayName: adapter.displayName,
    type: adapter.type,
    baseUrl: adapter.baseUrl,
    rateLimitPerSec: adapter.rateLimitPerSec,
    config: { source: "https://graphql.anilist.co" },
  });
  console.log(`✓ Source 'anilist' registrada (id=${sourceId})\n`);

  const logger = new SyncLogger({
    sourceId,
    sourceName: "anilist",
    mode: "initial",
    metadata: { limit, has_token: !!process.env.ANILIST_TOKEN },
    consoleLogger: {
      info: (m, ...a) => console.log(`  ${m}`, ...a),
      warn: (m, ...a) => console.warn(`  ⚠ ${m}`, ...a),
      error: (m, ...a) => console.error(`  ✗ ${m}`, ...a),
    },
  });

  let cursor: string | null | undefined = undefined;
  let imported = 0, updated = 0, duplicates = 0, failed = 0;
  const seen = new Set<string>();
  const pageSize = 50;

  while (imported + updated + duplicates + failed < limit) {
    const remaining = limit - imported - updated - duplicates - failed;
    const currentLimit = Math.min(pageSize, remaining);

    let page;
    try {
      page = await adapter.listNovels({ cursor, limit: currentLimit });
    } catch (e: any) {
      logger.logError({ errorType: "PaginationError", error: e, context: { cursor } });
      console.error(`  Falha: ${e.message}`);
      break;
    }

    if (page.items.length === 0) {
      console.log("  Página vazia.");
      break;
    }

    logger.incFound(page.items.length);
    console.log(`\n→ Página ${cursor ?? 1}: ${page.items.length} obras`);

    for (const ln of page.items) {
      if (seen.has(ln.externalId)) continue;
      seen.add(ln.externalId);

      try {
        const result: UpsertResult = upsertNovel(ln, { sourceId, sourceName: "anilist" });
        switch (result.outcome) {
          case "imported":
            imported++;
            logger.incImported();
            console.log(`  + [${ln.externalId}] ${ln.title} (score: ${ln.score?.toFixed(1) ?? "?"})`);
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
  console.log("║  RESUMO DO IMPORT ANILIST                  ║");
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
