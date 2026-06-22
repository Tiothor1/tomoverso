/**
 * /api/cron/sync-weekly
 *
 * Cron semanal — roda toda quinta às 03:00 UTC (00:00 BRT).
 * Itera todas as fontes habilitadas e chama runSync pra cada uma,
 * atualizando metadados (capas, sinopses, status, score, tags).
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`
 *
 * Configurado em vercel.json:
 *   "crons": [{ "path": "/api/cron/sync-weekly", "schedule": "0 3 * * 4" }]
 *
 * Limites:
 * - Vercel Hobby: 10s timeout (suficiente pra 200 VNs ~3s)
 * - Vercel Pro: 60s (suficiente pra 1000+ VNs)
 *
 * Para imports iniciais grandes (>1000), use o CLI.
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runSync, listAdapterNames, isAdapterRegistered } from "@/lib/ingest";

// Força dynamic (não cacheia)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // segundos

const DEFAULT_LIMIT_PER_SOURCE = 200;

interface SourceRow {
  id: string;
  name: string;
  enabled: number;
}

function checkAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  // Se CRON_SECRET não estiver configurado, BLOQUEIA a request (fail-closed)
  if (!expected) {
    console.warn("[cron:sync-weekly] CRON_SECRET não configurado — bloqueando");
    return false;
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");

  return provided === expected;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  const startTime = Date.now();
  console.log("[cron:sync-weekly] Iniciando sync semanal...");

  // Carrega fontes habilitadas do DB
  const db = getDb();
  const sources = db.prepare(`
    SELECT id, name, enabled FROM sources WHERE enabled = 1 ORDER BY name
  `).all() as SourceRow[];

  if (sources.length === 0) {
    console.log("[cron:sync-weekly] Nenhuma fonte habilitada.");
    return NextResponse.json({
      ok: true,
      message: "Nenhuma fonte habilitada",
      sources_run: 0,
      duration_ms: Date.now() - startTime,
    });
  }

  // Filtra só fontes que têm adapter registrado
  const eligible = sources.filter((s) => isAdapterRegistered(s.name));

  if (eligible.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Nenhuma fonte habilitada com adapter registrado",
      available_adapters: listAdapterNames(),
      duration_ms: Date.now() - startTime,
    });
  }

  console.log(`[cron:sync-weekly] ${eligible.length} fonte(s) habilitada(s):`, eligible.map((s) => s.name).join(", "));

  // Roda sync pra cada fonte sequencialmente
  const results: any[] = [];
  let totalImported = 0, totalUpdated = 0, totalFailed = 0;

  for (const source of eligible) {
    console.log(`[cron:sync-weekly] → Sincronizando '${source.name}'...`);
    try {
      const result = await runSync({
        sourceName: source.name,
        mode: "weekly",
        limit: DEFAULT_LIMIT_PER_SOURCE,
        pageSize: 100,
        onLog: (msg) => console.log(`[cron:${source.name}]`, msg),
      });
      totalImported += result.imported;
      totalUpdated += result.updated;
      totalFailed += result.failed;
      results.push({
        source: source.name,
        status: result.status,
        imported: result.imported,
        updated: result.updated,
        failed: result.failed,
        duration_ms: result.durationMs,
        runId: result.runId,
      });
    } catch (e: any) {
      console.error(`[cron:sync-weekly] Falha em '${source.name}':`, e.message);
      results.push({
        source: source.name,
        status: "failed",
        error: e.message,
      });
      totalFailed++;
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[cron:sync-weekly] Finalizado em ${durationMs}ms — importadas=${totalImported} atualizadas=${totalUpdated} falhas=${totalFailed}`);

  return NextResponse.json({
    ok: true,
    message: "Sync semanal concluído",
    duration_ms: durationMs,
    sources_run: results.length,
    totals: {
      imported: totalImported,
      updated: totalUpdated,
      failed: totalFailed,
    },
    results,
  });
}

// Também aceita POST pra compatibilidade (alguns schedulers usam POST)
export const POST = GET;
