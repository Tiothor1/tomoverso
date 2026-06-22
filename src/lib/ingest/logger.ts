/**
 * Logger — grava execuções de sincronização em `sync_runs` e erros em `sync_errors`.
 *
 * Cada adapter usa um SyncLogger para registrar o início/fim de uma execução
 * e quaisquer erros durante o processo. Permite auditoria completa via
 * painel admin em /admin/imports.
 *
 * Sem dependência externa — usa better-sqlite3 diretamente.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

export type SyncMode = "initial" | "weekly" | "daily" | "manual";
export type SyncStatus = "running" | "success" | "partial" | "failed";

export interface SyncLoggerOptions {
  sourceId?: string | null;
  sourceName: string;
  mode: SyncMode;
  /** Metadata adicional (opcional) */
  metadata?: Record<string, unknown>;
  /** Logger de console (default: console) */
  consoleLogger?: {
    info: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, ...args: unknown[]) => void;
  };
}

export class SyncLogger {
  readonly runId: string;
  private readonly opts: SyncLoggerOptions;
  private readonly db = getDb();
  private readonly startedAt = Date.now();
  private finishedAt: number | null = null;
  private itemsFound = 0;
  private itemsImported = 0;
  private itemsUpdated = 0;
  private itemsSkipped = 0;
  private itemsFailed = 0;

  constructor(opts: SyncLoggerOptions) {
    this.opts = opts;
    this.runId = randomUUID();
    this.console.info(`[sync:${this.opts.sourceName}] Starting run ${this.runId} (mode=${this.opts.mode})`);

    // Cria registro inicial
    this.db.prepare(`
      INSERT INTO sync_runs (id, source_id, source_name, mode, status, started_at, metadata)
      VALUES (?, ?, ?, ?, 'running', datetime('now'), ?)
    `).run(
      this.runId,
      this.opts.sourceId ?? null,
      this.opts.sourceName,
      this.opts.mode,
      JSON.stringify(this.opts.metadata ?? {})
    );
  }

  private get console() {
    return this.opts.consoleLogger ?? console;
  }

  // ── Contadores ─────────────────────────────────────────────────────

  incFound(n = 1) { this.itemsFound += n; }
  incImported(n = 1) { this.itemsImported += n; }
  incUpdated(n = 1) { this.itemsUpdated += n; }
  incSkipped(n = 1) { this.itemsSkipped += n; }
  incFailed(n = 1) { this.itemsFailed += n; }

  // ── Logs de erro (vão pra sync_errors) ─────────────────────────────

  logError(opts: {
    externalId?: string;
    errorType?: string;
    error: Error | string;
    context?: Record<string, unknown>;
  }) {
    this.incFailed();

    const error = typeof opts.error === "string" ? new Error(opts.error) : opts.error;
    const errorId = randomUUID();

    this.db.prepare(`
      INSERT INTO sync_errors (id, run_id, external_id, error_type, error_message, stack_trace, context)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      errorId,
      this.runId,
      opts.externalId ?? null,
      opts.errorType ?? error.name ?? "Error",
      error.message.slice(0, 1000),
      (error.stack ?? "").slice(0, 4000),
      opts.context ? JSON.stringify(opts.context).slice(0, 2000) : null
    );

    this.console.error(
      `[sync:${this.opts.sourceName}] ${opts.externalId ?? "?"} — ${error.message}`
    );
  }

  // ── Finaliza a run ─────────────────────────────────────────────────

  finish(status?: SyncStatus): SyncRunSummary {
    // Auto-detecta status se não fornecido
    const finalStatus: SyncStatus =
      status ??
      (this.itemsFailed === 0
        ? "success"
        : this.itemsImported + this.itemsUpdated > 0
          ? "partial"
          : "failed");

    this.finishedAt = Date.now();
    const durationMs = this.finishedAt - this.startedAt;
    const finishedAtIso = new Date(this.finishedAt).toISOString().replace("T", " ").slice(0, 19);

    this.db.prepare(`
      UPDATE sync_runs
      SET status = ?, finished_at = ?,
          duration_ms = ?,
          items_found = ?, items_imported = ?, items_updated = ?,
          items_skipped = ?, items_failed = ?
      WHERE id = ?
    `).run(
      finalStatus,
      finishedAtIso,
      durationMs,
      this.itemsFound,
      this.itemsImported,
      this.itemsUpdated,
      this.itemsSkipped,
      this.itemsFailed,
      this.runId
    );

    // Atualiza last_run_at / last_run_status da source (se sourceId fornecido)
    if (this.opts.sourceId) {
      this.db.prepare(`
        UPDATE sources
        SET last_run_at = datetime('now'),
            last_run_status = ?
        WHERE id = ?
      `).run(finalStatus, this.opts.sourceId);
    }

    this.console.info(
      `[sync:${this.opts.sourceName}] Finished in ${durationMs}ms — ` +
        `found=${this.itemsFound} imported=${this.itemsImported} updated=${this.itemsUpdated} ` +
        `skipped=${this.itemsSkipped} failed=${this.itemsFailed} status=${finalStatus}`
    );

    return {
      runId: this.runId,
      status: finalStatus,
      durationMs,
      itemsFound: this.itemsFound,
      itemsImported: this.itemsImported,
      itemsUpdated: this.itemsUpdated,
      itemsSkipped: this.itemsSkipped,
      itemsFailed: this.itemsFailed,
    };
  }
}

export interface SyncRunSummary {
  runId: string;
  status: SyncStatus;
  durationMs: number;
  itemsFound: number;
  itemsImported: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
}

// ── Helper pra registrar/atualizar uma fonte ──────────────────────────

export interface UpsertSourceOptions {
  id: string;
  name: string;
  displayName: string;
  type: "api" | "scrape";
  baseUrl?: string;
  rateLimitPerSec: number;
  config?: Record<string, unknown>;
}

/**
 * Registra ou atualiza uma fonte. Retorna o ID REAL no banco:
 * - Se a fonte não existia, retorna o `id` fornecido.
 * - Se já existia (mesmo `name`), retorna o ID antigo (ON CONFLICT não troca ID).
 *
 * IMPORTANTE: sempre use o ID retornado, nunca o `id` que você passou,
 * pois em re-execuções o ID antigo será preservado.
 */
export function upsertSource(opts: UpsertSourceOptions): string {
  const db = getDb();
  db.prepare(`
    INSERT INTO sources (id, name, display_name, type, base_url, rate_limit_per_sec, config)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      display_name = excluded.display_name,
      type = excluded.type,
      base_url = excluded.base_url,
      rate_limit_per_sec = excluded.rate_limit_per_sec,
      config = excluded.config
  `).run(
    opts.id,
    opts.name,
    opts.displayName,
    opts.type,
    opts.baseUrl ?? null,
    opts.rateLimitPerSec,
    JSON.stringify(opts.config ?? {})
  );

  // Retorna o ID real (pode ser diferente do passado se houve conflito)
  const row = db.prepare(`SELECT id FROM sources WHERE name = ?`).get(opts.name) as { id: string } | undefined;
  if (!row) {
    throw new Error(`upsertSource falhou: source '${opts.name}' não encontrada após upsert`);
  }
  return row.id;
}
