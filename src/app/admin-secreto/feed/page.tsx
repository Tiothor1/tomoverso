import Link from "next/link";
import { AlertTriangle, BarChart3, EyeOff, MessageCircle, Newspaper, Search, Shield, Sparkles, ThumbsUp } from "lucide-react";
import { getDb } from "@/lib/db";
import { hideFeedPostV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatInteger, readSearchParams, safeAll, safeCount, tableExists, truncateText } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type FeedPostRow = { id: string; type?: string; title?: string; body?: string; media_url?: string; work_type?: string; work_id?: string; status?: string; visibility?: string; created_at?: string; updated_at?: string; display_name?: string; username?: string; likes?: number; comments?: number; reports?: number; work_title?: string; work_slug?: string };

export default async function AdminFeedPage(props: { searchParams?: Promise<{ q?: string; status?: string }> | { q?: string; status?: string } }) {
  const secretPath = getAdminSecretPath();
  const user = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    const sp = await readSearchParams(props.searchParams);
    const q = (sp.q || "").trim();
    const status = (sp.status || "").trim();
    const hasFeed = tableExists(db, "feed_posts");

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (q) {
      conditions.push("(fp.title LIKE ? OR fp.body LIKE ? OR u.display_name LIKE ? OR u.username LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      conditions.push("fp.status = ?");
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const posts = hasFeed ? safeAll<FeedPostRow>(db, `
      SELECT fp.id, fp.type, fp.title, fp.body, fp.media_url, fp.work_type, fp.work_id, fp.status, fp.visibility, fp.created_at, fp.updated_at,
             u.display_name, u.username,
             CASE WHEN fp.work_type='novel' THEN n.title WHEN fp.work_type='manga' THEN m.title ELSE NULL END as work_title,
             CASE WHEN fp.work_type='novel' THEN n.slug WHEN fp.work_type='manga' THEN m.slug ELSE NULL END as work_slug,
             (SELECT COUNT(*) FROM feed_interactions fi WHERE fi.target_type='post' AND fi.target_id=fp.id AND fi.interaction_type='like') as likes,
             (SELECT COUNT(*) FROM feed_comments fc WHERE fc.post_id=fp.id AND fc.status='active') as comments,
             (SELECT COUNT(*) FROM feed_reports fr WHERE fr.target_type='post' AND fr.target_id=fp.id AND fr.status='pending') as reports
      FROM feed_posts fp
      LEFT JOIN users u ON u.id = fp.user_id
      LEFT JOIN novels n ON fp.work_type='novel' AND n.id = fp.work_id
      LEFT JOIN mangas m ON fp.work_type='manga' AND m.id = fp.work_id
      ${where}
      ORDER BY reports DESC, fp.created_at DESC
      LIMIT 80
    `, ...params) : [];

    const active = hasFeed ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_posts WHERE status='active'") : 0;
    const hidden = hasFeed ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_posts WHERE status='hidden'") : 0;
    const pendingReports = tableExists(db, "feed_reports") ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_reports WHERE status='pending'") : 0;
    const interactions = tableExists(db, "feed_interactions") ? safeCount(db, "SELECT COUNT(*) AS c FROM feed_interactions") : 0;

    return (
      <AdminHubShell secretPath={secretPath} active="feed" title="Feed admin" subtitle="Administração visual do feed público, posts recentes, engajamento e conteúdo problemático." user={user}>
        {!hasFeed ? (
          <AdminPanel className="border-amber-400/20 bg-amber-950/20"><div className="flex gap-3 text-amber-100"><AlertTriangle className="h-5 w-5" /><p>Dados indisponíveis neste ambiente: tabela <code>feed_posts</code> ainda não existe. A estrutura está pronta e segura.</p></div></AdminPanel>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Ativos</p><p className="mt-2 text-3xl font-semibold text-emerald-100">{formatInteger(active)}</p><p className="mt-1 text-sm text-slate-400">posts públicos</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Ocultos</p><p className="mt-2 text-3xl font-semibold text-rose-100">{formatInteger(hidden)}</p><p className="mt-1 text-sm text-slate-400">removidos do público</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Denúncias</p><p className="mt-2 text-3xl font-semibold text-amber-100">{formatInteger(pendingReports)}</p><p className="mt-1 text-sm text-slate-400">pendentes no feed</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Interações</p><p className="mt-2 text-3xl font-semibold text-cyan-100">{formatInteger(interactions)}</p><p className="mt-1 text-sm text-slate-400">likes/views/sinais</p></AdminPanel>
        </div>

        <AdminHubSection eyebrow="Filtro" title="Posts do feed" description="Busca, status, denúncias e ações rápidas de moderação.">
          <AdminPanel>
            <form method="GET" className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Título, conteúdo ou autor..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todos status</option>
                <option value="active">Ativo</option>
                <option value="hidden">Oculto</option>
                <option value="pending">Pendente</option>
                <option value="removed">Removido</option>
              </select>
              <div className="flex gap-2"><button type="submit" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">Filtrar</button>{(q || status) && <Link href={`/${secretPath}/feed`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}</div>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Conteúdo" title="Posts recentes" description="Ocultar post remove do feed público. Destaques/recomendações ficam preparados para evolução do ranking.">
          {posts.length === 0 ? (
            <AdminEmptyState icon={Newspaper} title="Nenhum post encontrado" description="Sem posts neste ambiente/filtro. Quando o feed estiver ativo, os itens aparecerão aqui." />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <AdminPanel key={post.id} className={post.reports ? "border-amber-400/20 bg-amber-950/10" : ""}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><Newspaper className="h-4 w-4 text-cyan-300" /><h3 className="font-semibold text-slate-100">{post.title || `${post.type || "Post"} sem título`}</h3><AdminStatusBadge tone={post.status === "active" ? "emerald" : post.status === "hidden" ? "rose" : "amber"}>{post.status || "active"}</AdminStatusBadge>{post.reports ? <AdminStatusBadge tone="amber">{post.reports} denúncia(s)</AdminStatusBadge> : null}</div>
                      <p className="mt-2 text-xs text-slate-500">por {post.display_name || post.username || "usuário"} · {post.created_at?.slice(0, 16) || "—"} · {post.visibility || "public"}</p>
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">{truncateText(post.body, 420) || "Sem corpo textual."}</p>
                      {post.work_title ? <p className="mt-3 text-xs text-slate-500">Obra vinculada: {post.work_slug ? <Link href={post.work_type === "manga" ? `/manga/${post.work_slug}` : `/novels/${post.work_slug}`} target="_blank" className="text-cyan-300 hover:text-cyan-200">{post.work_title}</Link> : post.work_title}</p> : null}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><ThumbsUp className="mx-auto mb-1 h-4 w-4 text-cyan-300" />{formatInteger(Number(post.likes || 0))}</div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><MessageCircle className="mx-auto mb-1 h-4 w-4 text-violet-300" />{formatInteger(Number(post.comments || 0))}</div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><AlertTriangle className="mx-auto mb-1 h-4 w-4 text-amber-300" />{formatInteger(Number(post.reports || 0))}</div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href="/feed" target="_blank" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.07]">Abrir feed</Link>
                        {post.status !== "hidden" ? <form action={hideFeedPostV2Action}><input type="hidden" name="post_id" value={post.id} /><ConfirmSubmitButton variant="warning" message="Ocultar este post do feed público?"><EyeOff className="h-3.5 w-3.5" /> Ocultar</ConfirmSubmitButton></form> : <AdminStatusBadge tone="rose">oculto</AdminStatusBadge>}
                      </div>
                    </div>
                  </div>
                </AdminPanel>
              ))}
            </div>
          )}
        </AdminHubSection>

        <AdminHubSection eyebrow="Preparado" title="Próximas funções visuais" description="Estrutura pronta sem quebrar enquanto o backend do feed evolui.">
          <div className="grid gap-4 md:grid-cols-3"><AdminPanel><Sparkles className="h-5 w-5 text-amber-300" /><h3 className="mt-3 font-semibold text-slate-100">Destaques</h3><p className="mt-2 text-sm text-slate-400">Pronto para controlar posts recomendados quando houver coluna/serviço de destaque.</p></AdminPanel><AdminPanel><BarChart3 className="h-5 w-5 text-cyan-300" /><h3 className="mt-3 font-semibold text-slate-100">Engajamento</h3><p className="mt-2 text-sm text-slate-400">Likes, comentários e denúncias já aparecem por post.</p></AdminPanel><AdminPanel><Shield className="h-5 w-5 text-violet-300" /><h3 className="mt-3 font-semibold text-slate-100">Moderação</h3><p className="mt-2 text-sm text-slate-400">Integra com denúncias e ocultação segura por server action.</p></AdminPanel></div>
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Feed admin V2 error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
