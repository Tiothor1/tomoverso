import Link from "next/link";
import { AlertTriangle, CheckCircle2, EyeOff, Flag, MessageCircle, Shield, XCircle } from "lucide-react";
import { getDb } from "@/lib/db";
import { hideCommentV2Action, hideFeedPostV2Action, updateReportStatusV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatInteger, safeAll, safeCount, tableExists } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type ReportRow = { id: string; target_type?: string; target_id?: string; reason?: string; status?: string; created_at?: string; reporter_name?: string; reporter_email?: string; source: "reports" | "feed_reports" };

export default async function AdminModeracaoPage() {
  const secretPath = getAdminSecretPath();
  const user = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    const hasReports = tableExists(db, "reports");
    const hasFeedReports = tableExists(db, "feed_reports");

    const reports = hasReports ? safeAll<ReportRow>(db, `
      SELECT r.id, r.target_type, r.target_id, r.reason, r.status, r.created_at, u.display_name as reporter_name, u.email as reporter_email, 'reports' as source
      FROM reports r
      LEFT JOIN users u ON u.id = r.reporter_id
      ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 80
    `) : [];

    const feedReports = hasFeedReports ? safeAll<ReportRow>(db, `
      SELECT fr.id, fr.target_type, fr.target_id, fr.reason, fr.status, fr.created_at, u.display_name as reporter_name, u.email as reporter_email, 'feed_reports' as source
      FROM feed_reports fr
      LEFT JOIN users u ON u.id = fr.reporter_id
      ORDER BY CASE fr.status WHEN 'pending' THEN 0 ELSE 1 END, fr.created_at DESC
      LIMIT 80
    `) : [];

    const allReports = [...reports, ...feedReports].sort((a, b) => {
      if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    }).slice(0, 120);

    const pending = safeCount(db, "SELECT COUNT(*) AS c FROM reports WHERE status='pending'") + (hasFeedReports ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_reports WHERE status='pending'") : 0);
    const resolved = safeCount(db, "SELECT COUNT(*) AS c FROM reports WHERE status='resolved'") + (hasFeedReports ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_reports WHERE status='resolved'") : 0);
    const dismissed = safeCount(db, "SELECT COUNT(*) AS c FROM reports WHERE status='dismissed'") + (hasFeedReports ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_reports WHERE status='dismissed'") : 0);

    return (
      <AdminHubShell secretPath={secretPath} active="moderacao" title="Denúncias e moderação" subtitle="Central segura para revisar denúncias de comentários, posts, obras e usuários." user={user}>
        {!hasReports && !hasFeedReports ? (
          <AdminPanel className="border-amber-400/20 bg-amber-950/20"><div className="flex gap-3 text-amber-100"><AlertTriangle className="h-5 w-5" /><p>Dados indisponíveis neste ambiente: tabelas de denúncias ainda não existem. A tela permanece segura e não quebra.</p></div></AdminPanel>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pendentes</p><p className="mt-2 text-3xl font-semibold text-amber-100">{formatInteger(pending)}</p><p className="mt-1 text-sm text-slate-400">precisam revisão</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Resolvidas</p><p className="mt-2 text-3xl font-semibold text-emerald-100">{formatInteger(resolved)}</p><p className="mt-1 text-sm text-slate-400">ação tomada</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Rejeitadas</p><p className="mt-2 text-3xl font-semibold text-slate-100">{formatInteger(dismissed)}</p><p className="mt-1 text-sm text-slate-400">sem violação</p></AdminPanel>
        </div>

        <AdminHubSection eyebrow="Fila" title="Denúncias recentes" description="Marque como resolvida, rejeite ou execute ações rápidas quando o alvo for conhecido.">
          {allReports.length === 0 ? (
            <AdminEmptyState icon={Shield} title="Nenhuma denúncia pendente" description="Se as tabelas existirem, novas denúncias aparecerão aqui automaticamente." />
          ) : (
            <div className="space-y-3">
              {allReports.map((report) => (
                <AdminPanel key={`${report.source}-${report.id}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Flag className="h-4 w-4 text-amber-300" />
                        <h3 className="font-semibold text-slate-100">{report.target_type || "conteúdo"} denunciado</h3>
                        <AdminStatusBadge tone={report.status === "pending" ? "amber" : report.status === "resolved" ? "emerald" : "slate"}>{report.status || "pending"}</AdminStatusBadge>
                        <AdminStatusBadge tone="violet">{report.source}</AdminStatusBadge>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">{report.reason || "Motivo não informado."}</p>
                      <p className="mt-2 text-xs text-slate-500">Alvo: {report.target_type}/{report.target_id} · Denunciante: {report.reporter_name || report.reporter_email || "—"} · {report.created_at?.slice(0, 16) || "—"}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      {report.target_type === "comment" ? <form action={hideCommentV2Action}><input type="hidden" name="comment_id" value={report.target_id || ""} /><ConfirmSubmitButton variant="warning" message="Ocultar o comentário denunciado?"><MessageCircle className="h-3.5 w-3.5" /> Ocultar comentário</ConfirmSubmitButton></form> : null}
                      {report.source === "feed_reports" && report.target_type === "post" ? <form action={hideFeedPostV2Action}><input type="hidden" name="post_id" value={report.target_id || ""} /><ConfirmSubmitButton variant="warning" message="Ocultar o post denunciado no feed?"><EyeOff className="h-3.5 w-3.5" /> Ocultar post</ConfirmSubmitButton></form> : null}
                      <form action={updateReportStatusV2Action}><input type="hidden" name="report_id" value={report.id} /><input type="hidden" name="table" value={report.source} /><input type="hidden" name="status" value="resolved" /><ConfirmSubmitButton variant="success" message="Marcar denúncia como resolvida?"><CheckCircle2 className="h-3.5 w-3.5" /> Resolver</ConfirmSubmitButton></form>
                      <form action={updateReportStatusV2Action}><input type="hidden" name="report_id" value={report.id} /><input type="hidden" name="table" value={report.source} /><input type="hidden" name="status" value="dismissed" /><ConfirmSubmitButton variant="ghost" message="Rejeitar/arquivar denúncia sem ação?"><XCircle className="h-3.5 w-3.5" /> Rejeitar</ConfirmSubmitButton></form>
                    </div>
                  </div>
                </AdminPanel>
              ))}
            </div>
          )}
        </AdminHubSection>

        <AdminHubSection eyebrow="Integração" title="Reflexo no site principal" description="Moderação conversa com comentários e feed público.">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminPanel><h3 className="font-semibold text-slate-100">Comentários</h3><p className="mt-2 text-sm text-slate-400">Ocultar comentário remove o texto público por soft delete.</p><Link href={`/${secretPath}/comentarios`} className="mt-4 inline-block text-sm text-cyan-300">Abrir comentários</Link></AdminPanel>
            <AdminPanel><h3 className="font-semibold text-slate-100">Feed</h3><p className="mt-2 text-sm text-slate-400">Posts ocultos deixam de aparecer no feed público.</p><Link href={`/${secretPath}/feed`} className="mt-4 inline-block text-sm text-cyan-300">Abrir feed admin</Link></AdminPanel>
            <AdminPanel><h3 className="font-semibold text-slate-100">Usuários</h3><p className="mt-2 text-sm text-slate-400">Usuários problemáticos podem ser banidos pela página de comunidade.</p><Link href={`/${secretPath}/usuarios`} className="mt-4 inline-block text-sm text-cyan-300">Abrir usuários</Link></AdminPanel>
          </div>
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Moderation admin V2 error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
