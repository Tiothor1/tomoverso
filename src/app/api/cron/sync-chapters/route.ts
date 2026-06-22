/**
 * /api/cron/sync-chapters
 *
 * Cron diário — roda todo dia às 06:00 UTC (03:00 BRT).
 *
 * Objetivo: detectar novos capítulos / volumes / atualizações de tradução.
 *
 * Hoje (com apenas VNDB que não expõe capítulos):
 *   - Faz "heartbeat" em cada fonte (atualiza last_run_at sem buscar nada)
 *   - Stub pronto pra quando tivermos fontes com capítulos (JIKAN, Royal Road)
 *
 * Quando adicionarmos fontes com capítulos (LN), este endpoint vai:
 *   1. Para cada novel no DB com source, chamar adapter.getNovel()
 *   2. Comparar external_score, status, last_synced_at
 *   3. Detectar novos volumes/capítulos via adapter.listChapters() se disponível
 *   4. Atualizar metadados
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { upsertSource, SyncLogger } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function checkAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.warn("[cron:sync-chapters] CRON_SECRET não configurado — bloqueando");
    return false;
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");
  return provided === expected;
}

interface SourceRow {
  id: string;
  name: string;
  enabled: number;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  const startTime = Date.now();
  console.log("[cron:sync-chapters] Iniciando sync diário...");

  const db = getDb();
  const sources = db.prepare(`
    SELECT id, name, enabled FROM sources WHERE enabled = 1 ORDER BY name
  `).all() as SourceRow[];

  if (sources.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Nenhuma fonte habilitada",
      sources_processed: 0,
      duration_ms: Date.now() - startTime,
    });
  }

  const results: any[] = [];

  for (const source of sources) {
    try {
      // Heartbeat: registra que a fonte foi checada hoje
      // (atualiza last_run_at sem buscar nada da API — barato)
      upsertSource({
        id: source.id,
        name: source.name,
        displayName: source.name,
        type: "api",
        rateLimitPerSec: 1,
        config: { last_heartbeat: new Date().toISOString() },
      });

      // Log da operação de heartbeat
      const logger = new SyncLogger({
        sourceId: source.id,
        sourceName: source.name,
        mode: "daily",
        metadata: { type: "heartbeat" },
      });
      const summary = logger.finish();

      console.log(`[cron:sync-chapters] Heartbeat '${source.name}' OK`);
      results.push({
        source: source.name,
        status: "heartbeat_ok",
        runId: summary.runId,
      });
    } catch (e: any) {
      console.error(`[cron:sync-chapters] Falha em '${source.name}':`, e.message);
      results.push({
        source: source.name,
        status: "failed",
        error: e.message,
      });
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[cron:sync-chapters] Finalizado em ${durationMs}ms — ${results.length} fonte(s)`);

  return NextResponse.json({
    ok: true,
    message: "Sync diário (heartbeat) concluído",
    duration_ms: durationMs,
    sources_processed: results.length,
    results,
    note: "Atualmente é heartbeat apenas. Quando houver fontes com capítulos (LN), este endpoint vai detectá-los aqui.",
  });
}

export const POST = GET;
