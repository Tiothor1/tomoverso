/**
 * /admin/imports — Painel de controle do sistema de ingestão.
 *
 * Mostra:
 * - Cards por fonte (status, contadores, última execução, botões de ação)
 * - Tabela de runs recentes (filtros por fonte/status)
 * - Tabela de erros (com botão de dismiss)
 * - Estatísticas globais
 */

export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  RefreshCw, Database, AlertTriangle, CheckCircle2, XCircle, Clock,
  PlayCircle, Power, Eye, ExternalLink, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  forceSyncSourceAction,
  toggleSourceEnabledAction,
  dismissSyncErrorAction,
} from "@/lib/actions/sync-actions";

interface SourceRow {
  id: string;
  name: string;
  display_name: string;
  type: string;
  base_url: string | null;
  rate_limit_per_sec: number;
  enabled: number;
  last_run_at: string | null;
  last_run_status: string | null;
}

interface RunRow {
  id: string;
  source_name: string;
  mode: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  items_found: number;
  items_imported: number;
  items_updated: number;
  items_skipped: number;
  items_failed: number;
}

interface ErrorRow {
  id: string;
  run_id: string;
  external_id: string | null;
  error_type: string | null;
  error_message: string;
  stack_trace: string | null;
  context: string | null;
  created_at: string;
}

export const metadata = {
  title: "Painel de Importações — Tomo Verso Editora",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.floor(s % 60)}s`;
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR");
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  success: { label: "Sucesso", variant: "default", icon: CheckCircle2 },
  partial: { label: "Parcial", variant: "secondary", icon: AlertTriangle },
  failed: { label: "Falhou", variant: "destructive", icon: XCircle },
  running: { label: "Rodando", variant: "outline", icon: RefreshCw },
};

export default async function AdminImportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.role !== "admin") redirect("/");

  const db = getDb();

  // ── Stats globais ────────────────────────────────────────────────
  const globalStats = {
    sources: (db.prepare("SELECT COUNT(*) c FROM sources").get() as any).c,
    enabledSources: (db.prepare("SELECT COUNT(*) c FROM sources WHERE enabled=1").get() as any).c,
    totalNovels: (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c,
    importedNovels: (db.prepare("SELECT COUNT(*) c FROM novels WHERE source IS NOT NULL").get() as any).c,
    sourceLinks: (db.prepare("SELECT COUNT(*) c FROM source_links").get() as any).c,
    runsToday: (db.prepare("SELECT COUNT(*) c FROM sync_runs WHERE started_at > datetime('now', '-1 day')").get() as any).c,
    runsThisWeek: (db.prepare("SELECT COUNT(*) c FROM sync_runs WHERE started_at > datetime('now', '-7 days')").get() as any).c,
    failedErrors: (db.prepare("SELECT COUNT(*) c FROM sync_errors").get() as any).c,
  };

  // ── Sources ──────────────────────────────────────────────────────
  const sources = db.prepare(`
    SELECT * FROM sources ORDER BY name
  `).all() as SourceRow[];

  // Stats por source (contadores de novels importadas)
  const novelCountBySource = new Map<string, number>();
  for (const row of db.prepare(`
    SELECT source, COUNT(*) c FROM novels WHERE source IS NOT NULL GROUP BY source
  `).all() as any[]) {
    novelCountBySource.set(row.source, row.c);
  }

  // ── Runs recentes (últimas 20) ───────────────────────────────────
  const recentRuns = db.prepare(`
    SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 20
  `).all() as RunRow[];

  // ── Erros recentes (últimos 30) ─────────────────────────────────
  const recentErrors = db.prepare(`
    SELECT * FROM sync_errors ORDER BY created_at DESC LIMIT 30
  `).all() as ErrorRow[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Admin</p>
          <h1 className="font-heading text-xl font-bold md:text-2xl">Painel de Importações</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Catálogo automático via APIs externas — status, runs e erros
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Voltar ao admin
          </Link>
        </Button>
      </div>

      {/* ── Stats globais ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <Database className="h-4 w-4 text-primary mb-1" />
          <div className="text-2xl font-heading font-bold">{globalStats.totalNovels}</div>
          <div className="text-xs text-muted-foreground">Novels no catálogo</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <RefreshCw className="h-4 w-4 text-emerald-500 mb-1" />
          <div className="text-2xl font-heading font-bold">{globalStats.importedNovels}</div>
          <div className="text-xs text-muted-foreground">Importadas de APIs</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <CheckCircle2 className="h-4 w-4 text-blue-500 mb-1" />
          <div className="text-2xl font-heading font-bold">{globalStats.runsThisWeek}</div>
          <div className="text-xs text-muted-foreground">Runs nesta semana</div>
        </CardContent></Card>
        <Card><CardContent className={globalStats.failedErrors > 0 ? "pt-4 pb-4" : "pt-4 pb-4"}>
          <AlertTriangle className={`h-4 w-4 mb-1 ${globalStats.failedErrors > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          <div className="text-2xl font-heading font-bold">{globalStats.failedErrors}</div>
          <div className="text-xs text-muted-foreground">Erros registrados</div>
        </CardContent></Card>
      </div>

      {/* ── Sources (cards) ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Fontes ({sources.length})
          </CardTitle>
          <CardDescription>
            Catálogo de fontes externas registradas. Use &quot;Forçar sync&quot; pra rodar manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sources.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              Nenhuma fonte registrada ainda. Rode um import CLI (ex: <code>npm run import:vndb</code>) pra registrar a primeira.
            </p>
          ) : (
            sources.map((src) => {
              const novelCount = novelCountBySource.get(src.name) ?? 0;
              const lastStatus = src.last_run_status ? statusBadge[src.last_run_status] : null;
              return (
                <div key={src.id} className="flex items-center gap-4 p-4 border border-border/60 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{src.display_name}</span>
                      <Badge variant="outline" className="text-[10px]">{src.type}</Badge>
                      {!src.enabled && <Badge variant="secondary" className="text-[10px]">Desabilitada</Badge>}
                      {lastStatus && (
                        <Badge variant={lastStatus.variant} className="text-[10px]">
                          <lastStatus.icon className="h-3 w-3 mr-1" />
                          {lastStatus.label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-x-3">
                      <span>{src.name}</span>
                      <span>{novelCount} novels</span>
                      <span>{src.rate_limit_per_sec} req/s</span>
                      {src.base_url && (
                        <a
                          href={src.base_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          API <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {src.last_run_at && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Última run: {formatDate(src.last_run_at)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={forceSyncSourceAction}>
                      <input type="hidden" name="source" value={src.name} />
                      <input type="hidden" name="limit" value="100" />
                      <Button type="submit" size="sm">
                        <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                        Sync 100
                      </Button>
                    </form>
                    <form action={toggleSourceEnabledAction}>
                      <input type="hidden" name="sourceId" value={src.id} />
                      <Button type="submit" size="sm" variant="outline" title={src.enabled ? "Desabilitar" : "Habilitar"}>
                        <Power className={`h-3.5 w-3.5 ${src.enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── Runs recentes ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Runs recentes ({recentRuns.length})
          </CardTitle>
          <CardDescription>Últimas execuções de sincronização.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentRuns.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma run registrada.</p>
          ) : (
            <div className="divide-y">
              {recentRuns.map((run) => {
                const sb = statusBadge[run.status];
                return (
                  <div key={run.id} className="px-4 py-3 flex items-center gap-4 text-sm">
                    <Badge variant={sb.variant} className="text-[10px] flex-shrink-0">
                      <sb.icon className="h-3 w-3 mr-1" />
                      {sb.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{run.source_name} <span className="text-muted-foreground font-normal">· {run.mode}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(run.started_at)} · {formatDuration(run.duration_ms)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span title="Encontradas" className="text-muted-foreground">{run.items_found} <Eye className="inline h-3 w-3" /></span>
                      <span title="Importadas" className="text-emerald-500">+{run.items_imported}</span>
                      <span title="Atualizadas" className="text-blue-500">~{run.items_updated}</span>
                      <span title="Duplicatas" className="text-muted-foreground">={run.items_skipped}</span>
                      {run.items_failed > 0 && (
                        <span title="Falharam" className="text-red-500">✗{run.items_failed}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Erros recentes ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Erros recentes ({recentErrors.length})
          </CardTitle>
          <CardDescription>
            Falhas registradas durante execuções. Clique em &quot;Dispensar&quot; pra limpar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentErrors.length === 0 ? (
            <p className="text-emerald-500 text-sm py-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
              Nenhum erro registrado. Sistema saudável.
            </p>
          ) : (
            <div className="divide-y">
              {recentErrors.map((err) => (
                <div key={err.id} className="px-4 py-3 flex items-start gap-3">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive" className="text-[10px]">{err.error_type ?? "Error"}</Badge>
                      {err.external_id && <code className="text-xs text-muted-foreground">{err.external_id}</code>}
                      <span className="text-xs text-muted-foreground">{formatDate(err.created_at)}</span>
                    </div>
                    <p className="text-sm mt-1 break-words">{err.error_message}</p>
                    {err.context && (
                      <pre className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2 rounded overflow-x-auto">
                        {err.context}
                      </pre>
                    )}
                  </div>
                  <form action={dismissSyncErrorAction}>
                    <input type="hidden" name="errorId" value={err.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Dispensar
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Rodapé: dicas ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 Comandos CLI úteis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono text-muted-foreground">
            <div><code className="text-foreground">npm run import:vndb -- --limit=2000</code> — importa top 2000 VNs do VNDB (~30s)</div>
            <div><code className="text-foreground">npm run migrate</code> — roda migrations pendentes</div>
            <div><code className="text-foreground">npm run migrate:status</code> — vê quais migrations já rodaram</div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Para imports grandes (&gt;500), prefira o CLI em vez do botão acima — o server action bloqueia o request.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
