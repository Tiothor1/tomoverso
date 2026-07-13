import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  DollarSign,
  Eye,
  FileSearch,
  FileText,
  Globe2,
  Layers3,
  MessageCircle,
  Shield,
  Sparkles,
  UploadCloud,
  Users,
  WalletCards,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureAdminAuthTable } from "@/lib/admin/admin-auth";
import { getAdminSecretPath } from "@/lib/admin/admin-v2-auth";
import { formatBRL, formatCompact, formatInteger, safeAll, safeCount, safeSum, tableExists, truncateText } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatCard } from "@/components/admin-v2/admin-hub-card";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import AdminSecretoLogin from "./login";

export const dynamic = "force-dynamic";

type ActivityRow = { action?: string; target_type?: string; created_at?: string; display_name?: string; username?: string };
type ImportRow = { id: string; status: string; detected_title?: string; original_name?: string; file_name?: string; error?: string; created_at?: string };
type CommentRow = { id: string; content?: string; created_at?: string; display_name?: string; username?: string; novel_title?: string; novel_slug?: string };

export default async function AdminSecretoPage() {
  const secretPath = getAdminSecretPath();

  try {
    ensureAdminAuthTable();
    const adminUser = await getCurrentUser().catch(() => null);
    if (!adminUser || adminUser.role !== "admin") return <AdminSecretoLogin />;

    const db = getDb();
    const novels = safeCount(db, "SELECT COUNT(*) AS c FROM novels");
    const mangas = safeCount(db, "SELECT COUNT(*) AS c FROM mangas");
    const novelChapters = safeCount(db, "SELECT COUNT(*) AS c FROM chapters");
    const mangaChapters = safeCount(db, "SELECT COUNT(*) AS c FROM manga_chapters");
    const comments = safeCount(db, "SELECT COUNT(*) AS c FROM comments");
    const users = safeCount(db, "SELECT COUNT(*) AS c FROM users WHERE email NOT LIKE '%@external.author'");
    const sessions = safeCount(db, "SELECT COUNT(*) AS c FROM sessions WHERE expires_at > datetime('now')");
    const sellers = safeCount(db, "SELECT COUNT(*) AS c FROM seller_profiles WHERE status='approved'");
    const totalViews = safeSum(db, "SELECT COALESCE(SUM(views), 0) AS c FROM novels");
    const totalSales = safeSum(db, "SELECT COALESCE(SUM(gross_amount_cents), 0) AS c FROM marketplace_payments WHERE status='approved'");
    const pendingWithdrawals = safeCount(db, "SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status='pending'");
    const pendingWithdrawalValue = safeSum(db, "SELECT COALESCE(SUM(amount_cents), 0) AS c FROM withdrawal_requests WHERE status='pending'");
    const pendingImports = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status IN ('pending','processing')");
    const errorImports = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status = 'error'");
    const pendingReports = safeCount(db, "SELECT COUNT(*) AS c FROM reports WHERE status = 'pending'") + (tableExists(db, "feed_reports") ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_reports WHERE status = 'pending'") : 0);
    const hiddenCatalog = safeCount(db, "SELECT COUNT(*) AS c FROM catalog_controls WHERE is_hidden = 1");
    const featuredCatalog = safeCount(db, "SELECT COUNT(*) AS c FROM catalog_controls WHERE is_featured = 1 OR show_on_home = 1");

    // ── Controle do Site: queries extras ──
    const novelByStatus = safeAll<{status:string; count:number}>(db, "SELECT status, COUNT(*) as count FROM novels GROUP BY status ORDER BY count DESC");
    const novelByType = safeAll<{type:string; count:number}>(db, "SELECT type, COUNT(*) as count FROM novels GROUP BY type");
    const novelOriginalCount = safeCount(db, "SELECT COUNT(*) AS c FROM novels WHERE COALESCE(source,'') = ''");
    const novelImportedCount = safeCount(db, "SELECT COUNT(*) AS c FROM novels WHERE COALESCE(source,'') != ''");
    const mangaByStatus = safeAll<{status:string; count:number}>(db, "SELECT status, COUNT(*) as count FROM mangas GROUP BY status ORDER BY count DESC");
    const userByRole = safeAll<{role:string; count:number}>(db, "SELECT role, COUNT(*) as count FROM users WHERE email NOT LIKE '%@external.author' GROUP BY role");
    const totalWorks = novels + mangas;
    const totalChapters = novelChapters + mangaChapters;
    let dbSizeMB = 0;
    try {
      const pc = (db.prepare("PRAGMA page_count").get() as any)?.page_count || 0;
      const ps = (db.prepare("PRAGMA page_size").get() as any)?.page_size || 4096;
      dbSizeMB = Math.round(pc * ps / 1024 / 1024 * 10) / 10;
    } catch {}

    const recentActivity = safeAll<ActivityRow>(db, `
      SELECT al.action, al.target_type, al.created_at, u.display_name, u.username
      FROM activity_log al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 6
    `);

    const recentImports = safeAll<ImportRow>(db, `
      SELECT id, status, detected_title, original_name, file_name, error, created_at
      FROM import_queue
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const recentComments = safeAll<CommentRow>(db, `
      SELECT c.id, c.content, c.created_at, u.display_name, u.username, n.title as novel_title, n.slug as novel_slug
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN novels n ON n.id = c.novel_id
      WHERE COALESCE(c.is_hidden, 0) = 0
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    const health = [
      { label: "Banco", ok: true, detail: `${formatInteger(novels + mangas)} obras` },
      { label: "Admin", ok: true, detail: "cookie + role admin" },
      { label: "Importações", ok: errorImports === 0, detail: errorImports ? `${errorImports} com erro` : `${pendingImports} na fila` },
      { label: "Moderação", ok: pendingReports === 0, detail: pendingReports ? `${pendingReports} pendentes` : "sem pendências" },
    ];

    return (
      <AdminHubShell
        secretPath={secretPath}
        active="overview"
        title="Central Tomo Verso"
        subtitle="Controle editorial, comunidade, conteúdo, importações e financeiro em um único hub."
        user={adminUser}
      >
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/95 to-cyan-950/30 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                <Shield className="h-3.5 w-3.5" /> Link secreto preservado · Admin Hub V2
              </div>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-50 sm:text-5xl">
                Central de controle editorial com visão real do site.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Métricas, conteúdo, comunidade, importações e dinheiro organizados em blocos claros — com atalhos para agir no site público sem trocar o fluxo de segurança.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/${secretPath}/upload`} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
                  Importar conteúdo
                </Link>
                <Link href={`/${secretPath}/novels`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]">
                  Gerenciar novels
                </Link>
                <Link href="/" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]">
                  Abrir site público
                </Link>
              </div>
            </div>
            <AdminPanel className="bg-black/25">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Saúde do sistema</p>
              <div className="mt-4 space-y-3">
                {health.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
                      <span className="text-sm font-medium text-slate-200">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-500">{item.detail}</span>
                  </div>
                ))}
              </div>
            </AdminPanel>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Usuários" value={formatCompact(users)} description="comunidade real, autores e leitores" icon={Users} tone="cyan" href={`/${secretPath}/usuarios`} />
          <AdminStatCard label="Novels" value={formatCompact(novels)} description={`${formatCompact(novelChapters)} capítulos de novel`} icon={BookOpen} tone="violet" href={`/${secretPath}/novels`} />
          <AdminStatCard label="Mangás" value={formatCompact(mangas)} description={`${formatCompact(mangaChapters)} capítulos de mangá`} icon={Layers3} tone="blue" href={`/${secretPath}/mangas`} />
          <AdminStatCard label="Receita" value={formatBRL(totalSales)} description={`${pendingWithdrawals} saques pendentes · ${formatBRL(pendingWithdrawalValue)}`} icon={DollarSign} tone={pendingWithdrawals ? "amber" : "emerald"} href={`/${secretPath}/finance`} />
          <AdminStatCard label="Comentários" value={formatCompact(comments)} description="moderação e interação em obras" icon={MessageCircle} tone="cyan" href={`/${secretPath}/comentarios`} />
          <AdminStatCard label="Visualizações" value={formatCompact(totalViews)} description="soma de leituras em novels" icon={Eye} tone="blue" href={`/${secretPath}/novels`} />
          <AdminStatCard label="Importações" value={formatCompact(pendingImports)} description={`${errorImports} erro(s) na fila`} icon={UploadCloud} tone={errorImports ? "rose" : "amber"} href={`/${secretPath}/analise`} />
          <AdminStatCard label="Sessões" value={formatCompact(sessions)} description={`${sellers} autores/vendedores aprovados`} icon={Activity} tone="emerald" href={`/${secretPath}/usuarios`} />
        </div>

        <AdminHubSection eyebrow="Acesso rápido" title="Operações principais" description="Atalhos organizados por impacto direto no site principal.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "Gerenciar novels", href: `/${secretPath}/novels`, icon: BookOpen, tone: "violet" as const, text: "Busca, status, capítulos, views, links públicos e exclusão segura." },
              { title: "Gerenciar mangás", href: `/${secretPath}/mangas`, icon: Layers3, tone: "blue" as const, text: "Capas, capítulos, páginas, origem e abertura no leitor público." },
              { title: "Usuários", href: `/${secretPath}/usuarios`, icon: Users, tone: "cyan" as const, text: "Email inline, ban/desban, admins destacados e perfis públicos." },
              { title: "Financeiro", href: `/${secretPath}/finance`, icon: WalletCards, tone: "amber" as const, text: "Receita, saldo, saques pendentes e confirmação de pagamento." },
              { title: "Upload", href: `/${secretPath}/upload`, icon: UploadCloud, tone: "emerald" as const, text: "Drag and drop para PDF, TXT, EPUB, DOCX e MD." },
              { title: "Análise", href: `/${secretPath}/analise`, icon: FileSearch, tone: "violet" as const, text: "Fila com pendente, processando, concluído, erro e revisão." },
              { title: "Feed/Admin", href: `/${secretPath}/feed`, icon: Globe2, tone: "blue" as const, text: "Posts recentes, engajamento e conteúdo problemático." },
            ].map((item) => (
              <Link key={item.title} href={item.href} className="group rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]">
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-slate-200"><item.icon className="h-5 w-5" /></div>
                  <span className="text-xs text-slate-500 group-hover:text-slate-300">Abrir</span>
                </div>
                <h3 className="mt-5 font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
              </Link>
            ))}
          </div>
        </AdminHubSection>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <AdminHubSection eyebrow="Alertas" title="Pendências que pedem atenção">
            <AdminPanel className="space-y-3">
              {[
                { label: "Saques pendentes", value: pendingWithdrawals, href: `/${secretPath}/finance`, icon: DollarSign, tone: pendingWithdrawals ? "amber" : "emerald" as const },
                { label: "Denúncias/moderação", value: pendingReports, href: `/${secretPath}/moderacao`, icon: Shield, tone: pendingReports ? "rose" : "emerald" as const },
                { label: "Importações com erro", value: errorImports, href: `/${secretPath}/analise`, icon: AlertTriangle, tone: errorImports ? "rose" : "emerald" as const },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-200">{item.label}</span>
                  </div>
                  <AdminStatusBadge tone={item.tone as any}>{formatInteger(item.value)}</AdminStatusBadge>
                </Link>
              ))}
            </AdminPanel>
          </AdminHubSection>

          <AdminHubSection eyebrow="Atividade" title="Movimento recente">
            <AdminPanel className="space-y-3">
              {recentActivity.length ? recentActivity.map((item, idx) => (
                <div key={`${item.action}-${item.created_at}-${idx}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-sm text-slate-200">{item.action || "atividade"} <span className="text-slate-500">em</span> {item.target_type || "sistema"}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.display_name || item.username || "Sistema"} · {item.created_at?.slice(0, 16) || "agora"}</p>
                </div>
              )) : <AdminEmptyState title="Sem atividade recente" description="Quando houver logs de uso, eles aparecem aqui." className="border-0 bg-transparent p-6" icon={BarChart3} />}
            </AdminPanel>
          </AdminHubSection>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminHubSection eyebrow="Comunidade" title="Comentários recentes">
            <AdminPanel className="space-y-3">
              {recentComments.length ? recentComments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{comment.display_name || comment.username || "Anônimo"}</p>
                      <p className="mt-1 text-xs text-slate-500">{comment.novel_title || "Obra não encontrada"}</p>
                    </div>
                    {comment.novel_slug ? <Link href={`/novels/${comment.novel_slug}`} className="text-xs text-cyan-300 hover:text-cyan-200">Abrir</Link> : null}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{truncateText(comment.content, 140)}</p>
                </div>
              )) : <AdminEmptyState title="Nenhum comentário ativo" description="Sem comentários recentes para moderar." className="border-0 bg-transparent p-6" icon={MessageCircle} />}
            </AdminPanel>
          </AdminHubSection>

          <AdminHubSection eyebrow="Importações" title="Fila recente">
            <AdminPanel className="space-y-3">
              {recentImports.length ? recentImports.map((item) => (
                <Link key={item.id} href={`/${secretPath}/analise`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{item.detected_title || item.original_name || item.file_name || item.id}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{item.error || item.created_at?.slice(0, 16) || "aguardando"}</p>
                    </div>
                    <AdminStatusBadge tone={item.status === "error" ? "rose" : item.status === "completed" ? "emerald" : "amber"}>{item.status}</AdminStatusBadge>
                  </div>
                </Link>
              )) : <AdminEmptyState title="Fila limpa" description="Envie arquivos pelo upload para popular a análise." actionHref={`/${secretPath}/upload`} actionLabel="Enviar arquivo" className="border-0 bg-transparent p-6" icon={FileText} />}
            </AdminPanel>
          </AdminHubSection>
        </div>

        {/* ═══════════════ Controle do Site ═══════════════ */}
        <AdminHubSection eyebrow="Diagnóstico" title="Controle do site" description="Capacidade, composição do acervo, engajamento e saúde do servidor em tempo real.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

            <AdminPanel className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-100 text-nowrap">
                <BookOpen className="h-4 w-4 text-cyan-300" /> Composição do acervo
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Obras totais</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(totalWorks)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Capítulos totais</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(totalChapters)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Novels (originais)</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(novels)} <span className="text-xs font-normal text-slate-500">({novelOriginalCount} originais)</span></span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Mangás</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(mangas)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {novelByStatus.map((s) => (
                    <span key={s.status} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                      {s.status} {s.count}
                    </span>
                  ))}
                  {mangaByStatus.map((s) => (
                    <span key={s.status} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                      {s.status} {s.count}
                    </span>
                  ))}
                </div>
              </div>
            </AdminPanel>

            <AdminPanel className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-100 text-nowrap">
                <Users className="h-4 w-4 text-violet-300" /> Engajamento & usuários
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Usuários reais</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(users)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Sessões ativas</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(sessions)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Visualizações (novels)</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(totalViews)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Comentários</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(comments)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {userByRole.map((r) => (
                    <span key={r.role} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                      {r.role}{r.role === "user" ? "s" : r.role === "admin" ? "ns" : "es"} {r.count}
                    </span>
                  ))}
                </div>
              </div>
            </AdminPanel>

            <AdminPanel className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-100 text-nowrap">
                <Activity className="h-4 w-4 text-emerald-300" /> Servidor & sistema
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Banco de dados</span>
                  <span className="text-sm font-semibold text-slate-50">{dbSizeMB > 0 ? `${dbSizeMB} MB` : "—"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Tabelas</span>
                  <span className="text-sm font-semibold text-slate-50">—</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Importações pendentes</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(pendingImports)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-xs text-slate-400">Importações com erro</span>
                  <span className="text-sm font-semibold text-slate-50">{formatCompact(errorImports)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                    {novels} novels
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                    {mangas} mangás
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                    {novelImportedCount} importados
                  </span>
                  {novelOriginalCount > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                      {novelOriginalCount} originais
                    </span>
                  )}
                </div>
              </div>
            </AdminPanel>

          </div>
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Admin Hub V2 crash:", error);
    return (
      <div className="min-h-screen bg-[#070812] p-6 text-slate-100">
        <AdminErrorState error={error} backHref={`/${secretPath}`} />
      </div>
    );
  }
}
