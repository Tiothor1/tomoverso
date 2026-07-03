import Link from "next/link";
import { BookOpen, EyeOff, MessageCircle, Search, UserRound } from "lucide-react";
import { getDb } from "@/lib/db";
import { hideCommentV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatInteger, readSearchParams, safeAll, safeCount, truncateText } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type CommentRow = {
  id: string;
  content?: string | null;
  is_hidden?: number | null;
  created_at?: string | null;
  paragraph_number?: number | null;
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
  novel_title?: string | null;
  novel_slug?: string | null;
  chapter_title?: string | null;
  chapter_number?: number | null;
};

export default async function AdminComentariosPage(props: { searchParams?: Promise<{ q?: string; status?: string }> | { q?: string; status?: string } }) {
  const secretPath = getAdminSecretPath();
  const user = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    const sp = await readSearchParams(props.searchParams);
    const q = (sp.q || "").trim();
    const status = (sp.status || "").trim();

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (q) {
      conditions.push("(c.content LIKE ? OR u.display_name LIKE ? OR u.username LIKE ? OR n.title LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status === "hidden") conditions.push("COALESCE(c.is_hidden, 0) = 1");
    if (status === "active") conditions.push("COALESCE(c.is_hidden, 0) = 0");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const comments = safeAll<CommentRow>(db, `
      SELECT c.id, c.content, c.is_hidden, c.created_at, c.paragraph_number,
             u.display_name, u.username, u.email,
             n.title as novel_title, n.slug as novel_slug,
             ch.title as chapter_title, ch.chapter_number
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN novels n ON n.id = c.novel_id
      LEFT JOIN chapters ch ON ch.id = c.chapter_id
      ${where}
      ORDER BY c.created_at DESC
      LIMIT 220
    `, ...params);

    const total = safeCount(db, "SELECT COUNT(*) AS c FROM comments");
    const hidden = safeCount(db, "SELECT COUNT(*) AS c FROM comments WHERE COALESCE(is_hidden,0)=1");
    const active = total - hidden;

    return (
      <AdminHubShell secretPath={secretPath} active="comentarios" title="Comentários" subtitle="Moderação editorial de comentários vinculados às obras e capítulos." user={user}>
        <div className="grid gap-4 md:grid-cols-3">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total</p><p className="mt-2 text-3xl font-semibold text-slate-50">{formatInteger(total)}</p><p className="mt-1 text-sm text-slate-400">comentários no banco</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Ativos</p><p className="mt-2 text-3xl font-semibold text-emerald-100">{formatInteger(active)}</p><p className="mt-1 text-sm text-slate-400">visíveis no público</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Ocultos</p><p className="mt-2 text-3xl font-semibold text-rose-100">{formatInteger(hidden)}</p><p className="mt-1 text-sm text-slate-400">soft delete/admin</p></AdminPanel>
        </div>

        <AdminHubSection eyebrow="Filtro" title="Buscar comentários" description="Filtre por texto, usuário ou obra antes de moderar.">
          <AdminPanel>
            <form method="GET" className="grid gap-3 lg:grid-cols-[1fr_190px_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Comentário, usuário ou obra..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todos status</option>
                <option value="active">Ativos</option>
                <option value="hidden">Ocultos</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">Buscar</button>
                {(q || status) && <Link href={`/${secretPath}/comentarios`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}
              </div>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Moderação" title="Comentários recentes" description="Ocultar comentário aplica soft delete e remove o texto público.">
          {comments.length === 0 ? (
            <AdminEmptyState icon={MessageCircle} title="Nenhum comentário encontrado" description="Sem comentários nesse filtro." />
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <AdminPanel key={comment.id} className={comment.is_hidden ? "opacity-65" : ""}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 text-slate-300"><UserRound className="h-3.5 w-3.5" /> {comment.display_name || comment.username || comment.email || "Anônimo"}</span>
                        <span>·</span>
                        {comment.novel_slug ? <Link href={`/novels/${comment.novel_slug}`} target="_blank" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200"><BookOpen className="h-3.5 w-3.5" /> {comment.novel_title || "Obra"}</Link> : <span>{comment.novel_title || "Obra não encontrada"}</span>}
                        {comment.chapter_number != null ? <><span>·</span><span>Cap. {comment.chapter_number}</span></> : null}
                        <span>·</span>
                        <span>{comment.created_at?.slice(0, 16) || "—"}</span>
                      </div>
                      <p className={`mt-3 text-sm leading-relaxed ${comment.is_hidden ? "italic text-slate-500" : "text-slate-200"}`}>
                        {comment.is_hidden ? "[removido por administração]" : truncateText(comment.content, 520)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AdminStatusBadge tone={comment.is_hidden ? "rose" : "emerald"}>{comment.is_hidden ? "Oculto" : "Ativo"}</AdminStatusBadge>
                        {comment.paragraph_number != null ? <AdminStatusBadge tone="blue">Parágrafo #{comment.paragraph_number}</AdminStatusBadge> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {comment.novel_slug ? <Link href={`/novels/${comment.novel_slug}`} target="_blank" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.07]">Ver obra</Link> : null}
                      {!comment.is_hidden ? (
                        <form action={hideCommentV2Action}>
                          <input type="hidden" name="comment_id" value={comment.id} />
                          <ConfirmSubmitButton variant="danger" message="Ocultar este comentário e substituir o conteúdo por [removido por administração]?">
                            <EyeOff className="h-3.5 w-3.5" /> Ocultar
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </AdminPanel>
              ))}
            </div>
          )}
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Admin comments V2 error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
