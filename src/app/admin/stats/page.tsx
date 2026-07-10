/**
 * /admin/stats — Estatísticas detalhadas do sistema de ingestão.
 *
 * Mostra:
 * - Crescimento do catálogo ao longo do tempo (por semana)
 * - Breakdown por fonte (donut-like via grid)
 * - Performance de cada sync (taxa de sucesso, items/min)
 * - Distribuição por tipo (light-novel, web-novel, visual-novel)
 */

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp, Database, BarChart3, Activity, AlertTriangle,
  ArrowRight, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

interface GrowthBucket {
  period: string;
  total: number;
  added: number;
}

interface SourceStat {
  source: string;
  total: number;
  added7d: number;
  added30d: number;
  last_run: string | null;
  last_status: string | null;
  runs7d: number;
  success_rate_7d: number;
  items_imported_30d: number;
  items_updated_30d: number;
}

interface SyncRunRow {
  source_name: string;
  mode: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  items_found: number;
  items_imported: number;
  items_updated: number;
  items_failed: number;
}

export const metadata = {
  title: "Estatísticas — Tomo Verso Editora Admin",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
}

export default async function AdminStatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/");

  const db = getDb();

  // ── Crescimento semanal (últimas 8 semanas) ─────────────────────
  const growthRaw = db.prepare(`
    SELECT
      strftime('%Y-W%W', created_at) AS period,
      COUNT(*) AS added
    FROM novels
    WHERE created_at > datetime('now', '-8 weeks')
    GROUP BY period
    ORDER BY period
  `).all() as Array<{ period: string; added: number }>;

  // Total cumulativo por período (precisamos pegar o total ANTES desse período + somar)
  const totalBefore = (db.prepare(`
    SELECT COUNT(*) as c FROM novels
    WHERE created_at < datetime('now', '-8 weeks')
  `).get() as any).c;

  let cumulative = totalBefore;
  const growth: GrowthBucket[] = growthRaw.map((g) => {
    cumulative += g.added;
    return { period: g.period, added: g.added, total: cumulative };
  });
  // Calcula max pra escalar o bar chart
  const maxTotal = Math.max(...growth.map((g) => g.total), 1);
  const minTotal = Math.min(...growth.map((g) => g.total), totalBefore);
  const maxBarHeight = 160; // px

  // ── Stats por fonte ──────────────────────────────────────────────
  const sources = db.prepare(`
    SELECT
      COALESCE(source, '(seed)') AS source,
      COUNT(*) AS total,
      SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN 1 ELSE 0 END) AS added_7d,
      SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 ELSE 0 END) AS added_30d
    FROM novels
    GROUP BY COALESCE(source, '(seed)')
    ORDER BY total DESC
  `).all() as Array<{ source: string; total: number; added_7d: number; added_30d: number }>;

  // Cruza com source stats (last run + runs 7d)
  const sourceStats: SourceStat[] = sources.map((s) => {
    const sourceRow = db.prepare(`SELECT id, last_run_at, last_run_status FROM sources WHERE name = ?`).get(s.source) as any;
    const runs7d = (db.prepare(`
      SELECT COUNT(*) as c,
        AVG(CASE WHEN status='success' THEN 1.0 ELSE 0.0 END) as success_rate
      FROM sync_runs WHERE source_name = ? AND started_at > datetime('now', '-7 days')
    `).get(s.source) as any);
    const items30d = (db.prepare(`
      SELECT
        COALESCE(SUM(items_imported), 0) as imp,
        COALESCE(SUM(items_updated), 0) as upd
      FROM sync_runs
      WHERE source_name = ? AND started_at > datetime('now', '-30 days') AND status IN ('success', 'partial')
    `).get(s.source) as any);
    return {
      source: s.source,
      total: s.total,
      added7d: s.added_7d,
      added30d: s.added_30d,
      last_run: sourceRow?.last_run_at ?? null,
      last_status: sourceRow?.last_run_status ?? null,
      runs7d: runs7d?.c ?? 0,
      success_rate_7d: Math.round(100 * (runs7d?.success_rate ?? 0)),
      items_imported_30d: items30d?.imp ?? 0,
      items_updated_30d: items30d?.upd ?? 0,
    };
  });

  // ── Distribuição por tipo ────────────────────────────────────────
  const byType = db.prepare(`
    SELECT type, COUNT(*) as c FROM novels GROUP BY type ORDER BY c DESC
  `).all() as Array<{ type: string; c: number }>;
  const totalNovels = byType.reduce((acc, t) => acc + t.c, 0);
  const typeColors: Record<string, string> = {
    "light-novel": "bg-emerald-500",
    "web-novel": "bg-blue-500",
    "visual-novel": "bg-purple-500",
    "short": "bg-amber-500",
  };
  const typeLabels: Record<string, string> = {
    "light-novel": "Light Novel",
    "web-novel": "Web Novel",
    "visual-novel": "Visual Novel",
    "short": "Short",
  };

  // ── Últimas 15 runs ─────────────────────────────────────────────
  const recentRuns = db.prepare(`
    SELECT source_name, mode, status, started_at, duration_ms,
           items_found, items_imported, items_updated, items_failed
    FROM sync_runs
    ORDER BY started_at DESC
    LIMIT 15
  `).all() as SyncRunRow[];

  // ── Stats globais ────────────────────────────────────────────────
  const globals = {
    total: totalNovels,
    sources: (db.prepare("SELECT COUNT(*) c FROM sources WHERE enabled=1").get() as any).c,
    runsTotal: (db.prepare("SELECT COUNT(*) c FROM sync_runs").get() as any).c,
    runs7d: (db.prepare("SELECT COUNT(*) c FROM sync_runs WHERE started_at > datetime('now', '-7 days')").get() as any).c,
    successRate: (() => {
      const row = db.prepare(`
        SELECT
          CASE WHEN COUNT(*) = 0 THEN 100
               ELSE ROUND(100.0 * SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) / COUNT(*))
          END as rate
        FROM sync_runs
      `).get() as { rate: number | null } | undefined;
      return row?.rate ?? 0;
    })(),
    errorsTotal: (db.prepare("SELECT COUNT(*) c FROM sync_errors").get() as any).c,
    addedLast30d: (db.prepare(`
      SELECT COUNT(*) c FROM novels WHERE created_at > datetime('now', '-30 days')
    `).get() as any).c,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Admin · Estatísticas</p>
          <h1 className="font-heading text-xl font-bold md:text-2xl">Crescimento & Saúde</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Como o catálogo tem crescido e como cada fonte está performando
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/imports">
              <Database className="h-4 w-4 mr-2" />
              Importações
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Admin
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stats globais ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <Database className="h-4 w-4 text-primary mb-1" />
          <div className="text-2xl font-heading font-bold">{globals.total.toLocaleString("pt-BR")}</div>
          <div className="text-xs text-muted-foreground">Novels no catálogo</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <TrendingUp className="h-4 w-4 text-emerald-500 mb-1" />
          <div className="text-2xl font-heading font-bold">+{globals.addedLast30d}</div>
          <div className="text-xs text-muted-foreground">Adicionadas nos últimos 30 dias</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <Activity className="h-4 w-4 text-blue-500 mb-1" />
          <div className="text-2xl font-heading font-bold">{globals.runs7d}</div>
          <div className="text-xs text-muted-foreground">Sync runs (7d)</div>
        </CardContent></Card>
        <Card><CardContent className={globals.errorsTotal > 0 ? "pt-4 pb-4" : "pt-4 pb-4"}>
          <AlertTriangle className={`h-4 w-4 mb-1 ${globals.errorsTotal > 0 ? "text-red-500" : "text-emerald-500"}`} />
          <div className="text-2xl font-heading font-bold">{globals.successRate}%</div>
          <div className="text-xs text-muted-foreground">Taxa de sucesso ({globals.errorsTotal} erros)</div>
        </CardContent></Card>
      </div>

      {/* ── Crescimento semanal (bar chart CSS) ──────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Crescimento semanal
          </CardTitle>
          <CardDescription>
            Número cumulativo de novels por semana (últimas 8 semanas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {growth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sem dados de crescimento ainda (imports muito recentes).
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2 h-[200px]">
                {growth.map((g) => {
                  const heightPct = maxTotal > minTotal
                    ? ((g.total - minTotal) / (maxTotal - minTotal)) * 100
                    : 100;
                  return (
                    <div key={g.period} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition">
                        {g.total.toLocaleString("pt-BR")}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-primary/30 to-primary rounded-t transition-all hover:from-primary/50 hover:to-primary"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                        title={`${g.period}: ${g.total} novels (+${g.added})`}
                      />
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {g.period}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>8 semanas atrás: {minTotal.toLocaleString("pt-BR")}</span>
                <span>Hoje: {growth[growth.length - 1]?.total.toLocaleString("pt-BR") || totalBefore.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stats por fonte ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Performance por fonte
          </CardTitle>
          <CardDescription>
            Como cada fonte externa está performando nos últimos 30 dias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sourceStats.map((s) => (
            <div key={s.source} className="p-4 border border-border/60 rounded-lg space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.source}</span>
                  {s.last_status && (
                    <Badge variant={s.last_status === "success" ? "default" : s.last_status === "partial" ? "secondary" : "destructive"} className="text-[10px]">
                      {s.last_status}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{s.total.toLocaleString("pt-BR")}</strong> novels
                  {s.added7d > 0 && <span className="ml-2 text-emerald-500">+{s.added7d} (7d)</span>}
                  {s.added30d > 0 && <span className="ml-1 text-emerald-500/70">+{s.added30d} (30d)</span>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground pt-1">
                <div>
                  <div className="font-semibold text-foreground">{s.runs7d}</div>
                  <div>Runs (7d)</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{s.success_rate_7d}%</div>
                  <div>Sucesso (7d)</div>
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    +{s.items_imported_30d} / ~{s.items_updated_30d}
                  </div>
                  <div>Importados / Atualizados (30d)</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Distribuição por tipo ────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byType.map((t) => {
              const pct = Math.round(100 * t.c / totalNovels);
              return (
                <div key={t.type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${typeColors[t.type] ?? "bg-muted"}`} />
                      {typeLabels[t.type] ?? t.type}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {t.c.toLocaleString("pt-BR")} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted/40 rounded overflow-hidden">
                    <div
                      className={`h-full ${typeColors[t.type] ?? "bg-muted"} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Atividade recente ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Atividade recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem runs.</p>
            ) : (
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {recentRuns.map((r, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                    <Badge variant={r.status === "success" ? "default" : r.status === "partial" ? "secondary" : "destructive"} className="text-[10px] w-16 justify-center">
                      {r.status}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {r.source_name} <span className="text-muted-foreground">· {r.mode}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(r.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {formatDuration(r.duration_ms)}
                      </div>
                    </div>
                    <div className="text-emerald-500 tabular-nums">+{r.items_imported}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
