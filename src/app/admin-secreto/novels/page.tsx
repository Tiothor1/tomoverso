import Link from "next/link";
import { BookOpen, Calendar, Eye, ExternalLink, FileText, Search, Sparkles, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { deleteNovelV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatCompact, formatInteger, imageFromRow, normalizeStatusLabel, readSearchParams, safeAll, statusTone, truncateText } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type NovelRow = {
  id: string;
  slug: string;
  title: string;
  synopsis?: string | null;
  type?: string | null;
  status?: string | null;
  views?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
  is_featured?: number | null;
  is_approved?: number | null;
  is_original?: number | null;
  author_name?: string | null;
  author_email?: string | null;
  chapter_count?: number;
  hidden?: number;
  curated_featured?: number;
  show_on_home?: number;
  curation_label?: string | null;
  cover_local_path?: string | null;
  cover_url?: string | null;
  cover_source_url?: string | null;
};

export default async function AdminNovelsPage(props: { searchParams?: Promise<{ q?: string; status?: string; type?: string }> | { q?: string; status?: string; type?: string } }) {
  const secretPath = getAdminSecretPath();
  const user = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    const sp = await readSearchParams(props.searchParams);
    const q = (sp.q || "").trim();
    const status = (sp.status || "").trim();
    const type = (sp.type || "").trim();

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (q) {
      conditions.push("(n.title LIKE ? OR n.slug LIKE ? OR n.synopsis LIKE ? OR u.display_name LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      conditions.push("n.status = ?");
      params.push(status);
    }
    if (type) {
      conditions.push("n.type = ?");
      params.push(type);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const novels = safeAll<NovelRow>(db, `
      SELECT n.id, n.slug, n.title, n.synopsis, n.type, n.status, n.views, n.updated_at, n.created_at,
             n.is_featured, n.is_approved, COALESCE(n.is_original, 0) as is_original,
             n.cover_local_path, n.cover_url, n.cover_source_url,
             u.display_name as author_name, u.email as author_email,
             COUNT(ch.id) as chapter_count,
             COALESCE(cc.is_hidden, 0) as hidden,
             COALESCE(cc.is_featured, n.is_featured, 0) as curated_featured,
             COALESCE(cc.show_on_home, 0) as show_on_home,
             cc.curation_label
      FROM novels n
      LEFT JOIN users u ON u.id = n.author_id
      LEFT JOIN chapters ch ON ch.novel_id = n.id
      LEFT JOIN catalog_controls cc ON cc.item_type = 'novel' AND cc.item_id = n.id
      ${where}
      GROUP BY n.id
      ORDER BY hidden ASC, curated_featured DESC, n.updated_at DESC, n.created_at DESC
      LIMIT 120
    `, ...params);

    const statuses = safeAll<{ status: string; c: number }>(db, "SELECT COALESCE(status, 'sem-status') as status, COUNT(*) as c FROM novels GROUP BY status ORDER BY c DESC");
    const totalChapters = novels.reduce((acc, n) => acc + Number(n.chapter_count || 0), 0);
    const totalViews = novels.reduce((acc, n) => acc + Number(n.views || 0), 0);

    return (
      <AdminHubShell secretPath={secretPath} active="novels" title="Novels" subtitle="Gerencie obras textuais, capítulos, curadoria e presença no site público." user={user}>
        <div className="grid gap-4 md:grid-cols-3">
          <AdminPanel>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Resultado</p>
            <p className="mt-2 text-3xl font-semibold text-slate-50">{formatInteger(novels.length)}</p>
            <p className="mt-1 text-sm text-slate-400">novels listadas nesta visão</p>
          </AdminPanel>
          <AdminPanel>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Capítulos</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-100">{formatInteger(totalChapters)}</p>
            <p className="mt-1 text-sm text-slate-400">capítulos conectados às obras</p>
          </AdminPanel>
          <AdminPanel>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Leituras</p>
            <p className="mt-2 text-3xl font-semibold text-violet-100">{formatCompact(totalViews)}</p>
            <p className="mt-1 text-sm text-slate-400">views somadas no recorte</p>
          </AdminPanel>
        </div>

        <AdminHubSection eyebrow="Filtro" title="Busca e refinamento" description="Filtre por título, slug, sinopse, autor, tipo ou status.">
          <AdminPanel>
            <form className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]" method="GET">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Buscar por título, slug, sinopse ou autor..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todos status</option>
                {statuses.map((s) => <option key={s.status} value={s.status}>{normalizeStatusLabel(s.status)} ({s.c})</option>)}
              </select>
              <select name="type" defaultValue={type} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todos tipos</option>
                <option value="novel">Novel</option>
                <option value="light-novel">Light novel</option>
                <option value="visual-novel">Visual novel</option>
                <option value="book">Livro</option>
              </select>
              <div className="flex gap-2">
                <button className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15" type="submit">Buscar</button>
                {(q || status || type) && <Link href={`/${secretPath}/novels`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}
              </div>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Obras" title="Tabela editorial" description="Cada ação tem reflexo no catálogo, leitor e curadoria do site principal.">
          {novels.length === 0 ? (
            <AdminEmptyState icon={BookOpen} title="Nenhuma novel encontrada" description="Ajuste a busca ou importe novas obras pelo fluxo de upload/análise." actionHref={`/${secretPath}/upload`} actionLabel="Importar conteúdo" />
          ) : (
            <AdminPanel className="overflow-hidden p-0">
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Obra</th>
                      <th className="px-5 py-4">Autor</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Capítulos</th>
                      <th className="px-5 py-4">Views</th>
                      <th className="px-5 py-4">Curadoria</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {novels.map((novel) => (
                      <tr key={novel.id} className="bg-transparent transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-10 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                              {imageFromRow(novel as any) ? <img src={imageFromRow(novel as any)!} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-600"><BookOpen className="h-4 w-4" /></div>}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-xs truncate font-medium text-slate-100">{novel.title}</p>
                              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">/{novel.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{novel.author_name || novel.author_email || "—"}</td>
                        <td className="px-5 py-4"><AdminStatusBadge tone={statusTone(novel.status)}>{normalizeStatusLabel(novel.status)}</AdminStatusBadge></td>
                        <td className="px-5 py-4 text-slate-300">{formatInteger(Number(novel.chapter_count || 0))}</td>
                        <td className="px-5 py-4 text-slate-300">{formatCompact(Number(novel.views || 0))}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {novel.hidden ? <AdminStatusBadge tone="rose">oculta</AdminStatusBadge> : null}
                            {novel.curated_featured ? <AdminStatusBadge tone="amber">destaque</AdminStatusBadge> : null}
                            {novel.show_on_home ? <AdminStatusBadge tone="cyan">home</AdminStatusBadge> : null}
                            {novel.is_original ? <AdminStatusBadge tone="emerald">original</AdminStatusBadge> : null}
                            {!novel.hidden && !novel.curated_featured && !novel.show_on_home && !novel.is_original ? <span className="text-xs text-slate-600">—</span> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link href={`/novels/${novel.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.07]"><ExternalLink className="h-3.5 w-3.5" /> Site</Link>
                            <Link href={`/novels/${novel.slug}#chapters`} target="_blank" className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.07]"><FileText className="h-3.5 w-3.5" /> Caps</Link>
                            <form action={deleteNovelV2Action}>
                              <input type="hidden" name="novel_id" value={novel.id} />
                              <ConfirmSubmitButton variant="danger" message={`Excluir permanentemente a novel '${novel.title}' e seus capítulos?`} title="Excluir novel">
                                <Trash2 className="h-3.5 w-3.5" /> Excluir
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {novels.map((novel) => (
                  <div key={novel.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex gap-3">
                      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                        {imageFromRow(novel as any) ? <img src={imageFromRow(novel as any)!} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-100">{novel.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{novel.author_name || "Sem autor"}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">{truncateText(novel.synopsis, 110)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AdminStatusBadge tone={statusTone(novel.status)}>{normalizeStatusLabel(novel.status)}</AdminStatusBadge>
                      <AdminStatusBadge tone="slate"><FileText className="mr-1 h-3 w-3" /> {formatInteger(Number(novel.chapter_count || 0))}</AdminStatusBadge>
                      <AdminStatusBadge tone="blue"><Eye className="mr-1 h-3 w-3" /> {formatCompact(Number(novel.views || 0))}</AdminStatusBadge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/novels/${novel.slug}`} target="_blank" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200">Abrir site</Link>
                      <form action={deleteNovelV2Action}>
                        <input type="hidden" name="novel_id" value={novel.id} />
                        <ConfirmSubmitButton variant="danger" message={`Excluir permanentemente a novel '${novel.title}' e seus capítulos?`}><Trash2 className="h-3.5 w-3.5" /> Excluir</ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </AdminPanel>
          )}
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Admin novels V2 error:", error);
    return (
      <div className="min-h-screen bg-[#070812] p-6 text-slate-100">
        <AdminErrorState error={error} backHref={`/${secretPath}`} />
      </div>
    );
  }
}
