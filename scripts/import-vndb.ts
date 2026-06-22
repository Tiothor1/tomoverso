/**
 * CLI — Importa obras do VNDB pra tabela novels.
 *
 * Uso:
 *   npx tsx scripts/import-vndb.ts [--limit=500] [--page-size=100]
 *
 * Padrão: top 500 VNs por votecount, em páginas de 100.
 *
 * ATENÇÃO: Roda contra o DB local (D:\Site-LN\data\tomoverso.db).
 *          Pode levar 5-15 min dependendo do rate-limit.
 */

import { randomUUID } from "crypto";
import {
  VndbAdapter,
  upsertNovel,
  upsertSource,
  SyncLogger,
  type UpsertResult,
} from "../src/lib/ingest";

// ── Parse args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 500;
  let pageSize = 100;
  let mode: "initial" | "manual" = "initial";

  for (const arg of args) {
    if (arg.startsWith("--limit=")) limit = parseInt(arg.slice("--limit=".length), 10);
    else if (arg.startsWith("--page-size=")) pageSize = parseInt(arg.slice("--page-size=".length), 10);
    else if (arg === "--mode=manual") mode = "manual";
  }

  // Clamps de segurança
  limit = Math.max(1, Math.min(limit, 5000));
  pageSize = Math.max(10, Math.min(pageSize, 100));

  return { limit, pageSize, mode };
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const { limit, pageSize, mode } = parseArgs();
  const startTime = Date.now();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  IMPORT VNDB → Tomoverso                   ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`  Limite: ${limit} VNs`);
  console.log(`  Page size: ${pageSize}`);
  console.log(`  Mode: ${mode}`);
  console.log(`  Início: ${new Date().toISOString()}\n`);

  // ── Inicializa ────────────────────────────────────────────────────
  const adapter = new VndbAdapter();

  // Registra/atualiza a source no DB. IMPORTANTE: usar o ID retornado,
  // pois em re-execuções o `ON CONFLICT` preserva o ID antigo.
  const requestedSourceId = randomUUID();
  const sourceId = upsertSource({
    id: requestedSourceId,
    name: "vndb",
    displayName: adapter.displayName,
    type: adapter.type,
    baseUrl: adapter.baseUrl,
    rateLimitPerSec: adapter.rateLimitPerSec,
    config: { source: "https://api.vndb.org/kana" },
  });
  console.log(`✓ Source 'vndb' registrada (id=${sourceId}${sourceId !== requestedSourceId ? " [recuperado]" : ""})\n`);

  // Logger com persistência em sync_runs
  const logger = new SyncLogger({
    sourceId,
    sourceName: "vndb",
    mode,
    metadata: { limit, pageSize, started_at: new Date().toISOString() },
    consoleLogger: {
      info: (msg, ...args) => console.log(`  ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`  ⚠ ${msg}`, ...args),
      error: (msg, ...args) => console.error(`  ✗ ${msg}`, ...args),
    },
  });

  // ── Loop de paginação ────────────────────────────────────────────
  let cursor: string | null | undefined = undefined;
  let imported = 0;
  let updated = 0;
  let duplicates = 0;
  let failed = 0;
  const seen = new Set<string>(); // pra detectar loop infinito

  while (imported + updated + duplicates + failed < limit) {
    const remaining = limit - imported - updated - duplicates - failed;
    const currentLimit = Math.min(pageSize, remaining);

    console.log(`\n→ Buscando página (cursor=${cursor ?? "início"}, limit=${currentLimit})...`);
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
      console.log(`  Página vazia — fim da paginação.`);
      break;
    }

    logger.incFound(page.items.length);
    console.log(`  Recebidas ${page.items.length} VNs`);

    // ── Upsert cada uma ──────────────────────────────────────────
    for (const vn of page.items) {
      if (seen.has(vn.externalId)) {
        console.log(`  ! [${vn.externalId}] já vista nesta run, pulando`);
        continue;
      }
      seen.add(vn.externalId);

      try {
        const result: UpsertResult = upsertNovel(vn, {
          sourceId,
          sourceName: "vndb",
        });

        switch (result.outcome) {
          case "imported":
            imported++;
            logger.incImported();
            console.log(`  + [${vn.externalId}] ${vn.title}`);
            break;
          case "updated":
            updated++;
            logger.incUpdated();
            console.log(`  ~ [${vn.externalId}] ${vn.title} (atualizada)`);
            break;
          case "duplicate":
            duplicates++;
            logger.incSkipped();
            console.log(`  = [${vn.externalId}] ${vn.title} (merge com ${result.mergedWith?.slice(0, 8)}...)`);
            break;
          case "skipped":
          case "failed":
            failed++;
            logger.incFailed();
            break;
        }
      } catch (e: any) {
        failed++;
        logger.logError({
          externalId: vn.externalId,
          errorType: "UpsertError",
          error: e,
          context: { title: vn.title },
        });
        console.error(`  ✗ [${vn.externalId}] ${vn.title}: ${e.message}`);
      }
    }

    // Progress a cada página
    const total = imported + updated + duplicates + failed;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = total / elapsedSec;
    const eta = rate > 0 ? Math.ceil((limit - total) / rate) : 0;
    console.log(`  📊 Total: ${total}/${limit} | elapsed: ${elapsedSec.toFixed(1)}s | ETA: ${eta}s`);

    cursor = page.nextCursor;
    if (!cursor) {
      console.log(`  Sem mais páginas.`);
      break;
    }
  }

  // ── Finaliza ─────────────────────────────────────────────────────
  const summary = logger.finish();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  RESUMO DO IMPORT                           ║");
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
