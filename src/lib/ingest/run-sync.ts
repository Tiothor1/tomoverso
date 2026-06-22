/**
 * runSync — função genérica que roda uma sincronização pra uma fonte.
 *
 * Usada por:
 * - Scripts CLI (import-vndb.ts)
 * - Server actions (forçar sync pelo painel admin)
 *
 * Itera todas as obras da fonte (com paginação) e faz upsert de cada uma.
 * Logs cada execução em sync_runs e cada erro em sync_errors.
 */

import { randomUUID } from "crypto";
import {
  upsertNovel,
  upsertSource,
  SyncLogger,
} from "./index";
import { getAdapter } from "./adapters";
import type { ExternalSource } from "./types";

export interface RunSyncOptions {
  sourceName: string; // ex: "vndb"
  mode: "initial" | "weekly" | "daily" | "manual";
  /** Máximo de obras a importar nesta run (default: 100) */
  limit?: number;
  /** Tamanho da página (default: 100, máximo da maioria das fontes) */
  pageSize?: number;
  /** Logger customizado (opcional — default: console) */
  onLog?: (msg: string) => void;
}

export interface RunSyncResult {
  runId: string;
  sourceId: string;
  status: "success" | "partial" | "failed";
  durationMs: number;
  imported: number;
  updated: number;
  duplicates: number;
  failed: number;
  total: number;
}

const log = (msg: string) => console.log(`  ${msg}`);

/**
 * Roda uma sincronização completa de uma fonte.
 * Retorna summary da execução.
 */
export async function runSync(opts: RunSyncOptions): Promise<RunSyncResult> {
  const limit = opts.limit ?? 100;
  const pageSize = Math.min(opts.pageSize ?? 100, 100);
  const onLog = opts.onLog ?? log;

  const adapter = getAdapter(opts.sourceName);
  if (!adapter) {
    throw new Error(
      `Adapter '${opts.sourceName}' não registrado. Adicione em src/lib/ingest/adapters/index.ts`
    );
  }

  // ── Registra/atualiza a fonte ──────────────────────────────────────
  const requestedId = randomUUID();
  const sourceId = upsertSource({
    id: requestedId,
    name: adapter.name,
    displayName: adapter.displayName,
    type: adapter.type,
    baseUrl: adapter.baseUrl,
    rateLimitPerSec: adapter.rateLimitPerSec,
    config: {},
  });

  onLog(`Source '${adapter.name}' ready (id=${sourceId.slice(0, 8)}...)`);

  // ── Logger ─────────────────────────────────────────────────────────
  const logger = new SyncLogger({
    sourceId,
    sourceName: adapter.name,
    mode: opts.mode,
    metadata: { limit, pageSize },
  });

  // ── Loop de paginação ─────────────────────────────────────────────
  let cursor: string | null | undefined = undefined;
  let imported = 0, updated = 0, duplicates = 0, failed = 0;
  const seen = new Set<string>();

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
      onLog(`Falha na paginação: ${e.message}`);
      break;
    }

    if (page.items.length === 0) {
      onLog(`Página vazia — fim da paginação.`);
      break;
    }

    logger.incFound(page.items.length);

    for (const vn of page.items) {
      if (seen.has(vn.externalId)) continue;
      seen.add(vn.externalId);

      try {
        const result = upsertNovel(vn, {
          sourceId,
          sourceName: adapter.name,
        });
        switch (result.outcome) {
          case "imported": imported++; logger.incImported(); break;
          case "updated": updated++; logger.incUpdated(); break;
          case "duplicate": duplicates++; logger.incSkipped(); break;
          case "skipped":
          case "failed": failed++; logger.incFailed(); break;
        }
      } catch (e: any) {
        failed++;
        logger.logError({
          externalId: vn.externalId,
          errorType: "UpsertError",
          error: e,
          context: { title: vn.title },
        });
      }
    }

    cursor = page.nextCursor;
    if (!cursor) break;
  }

  const summary = logger.finish();
  onLog(`Run ${summary.runId.slice(0, 8)}... ${summary.status} em ${summary.durationMs}ms`);

  return {
    runId: summary.runId,
    sourceId,
    status: summary.status as "success" | "partial" | "failed",
    durationMs: summary.durationMs,
    imported: summary.itemsImported,
    updated: summary.itemsUpdated,
    duplicates: summary.itemsSkipped,
    failed: summary.itemsFailed,
    total: imported + updated + duplicates + failed,
  };
}
