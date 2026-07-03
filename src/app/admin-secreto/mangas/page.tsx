import Link from "next/link";
import { Calendar, ExternalLink, FileImage, FileText, ImageIcon, Layers3, Search, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { deleteMangaV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatCompact, formatInteger, imageFromRow, normalizeStatusLabel, readSearchParams, safeAll, statusTone, truncateText } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type MangaRow = {
  id: string;
  slug: string;
  title: string;
  synopsis?: string | null;
  author?: string | null;
  artist?: string | null;
  status?: string | null;
  source?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  is_original?: number | null;
  cover_local_path?: string | null;
  cover_url?: string | null;
  chapter_count?: number;
  page_count?: number;
  hidden?: number;
  curated_featured?: number;
  show_on_home?: number;
};

export default async function AdminMangasPage(props: { searchParams?: Promise<{ q?: string; status?: string }> | { q?: string; status?: string } }) {
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
      conditions.push("(m.title LIKE ? OR m.slug LIKE ? OR m.synopsis LIKE ? OR m.author LIKE ? OR m.artist LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      conditions.push("m.status = ?");
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const mangas = safeAll<MangaRow>(db, `
      SELECT m.id, m.slug, m.title, m.synopsis, m.author, m.artist, m.status, m.source,
             m.cover_local_path, m.cover_url, m.updated_at, m.created_at, COALESCE(m.is_original, 0) as is_original,
             COALESCE(cc.is_hidden, 0) as hidden,
             COALESCE(cc.is_featured, 0) as curated_featured,
             COALESCE(cc.show_on_home, 0) as show_on_home,
             (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = m.id) as chapter_count,
             (SELECT COALESCE(SUM(mc.page_count), 0) FROM manga_chapters mc WHERE mc.manga_id = m.id) as page_count
      FROM mangas m
      LEFT JOIN catalog_controls cc ON cc.item_type = 'manga' AND cc.item_id = m.id
      ${where}
      ORDER BY hidden ASC, curated_featured DESC, m.updated_at DESC, m.created_at DESC
      LIMIT 120
    `, ...params);

    const statuses = safeAll<{ status: string; c: number }>(db, "SELECT COALESCE(status, 'sem-status') as status, COUNT(*) as c FROM mangas GROUP BY status ORDER BY c DESC");
    const totalChapters = mangas.reduce((acc, manga) => acc + Number(manga.chapter_count || 0), 0);
    const totalPages = mangas.reduce((acc, manga) => acc + Number(manga.page_count || 0), 0);

    return (
      <AdminHubShell secretPath={secretPath} active="mangas" title="Mangás" subtitle="Controle visual de mangás, capítulos, páginas, capas e links do leitor." user={user}>
        <div className="grid gap-4 md:grid-cols-3">
          <AdminPanel>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Resultado</p>
            <p className="mt-2 text-3xl font-semibold text-slate-50">{formatInteger(mangas.length)}</p>
            <p className="mt-1 text-sm text-slate-400">mangás listados</p>
          </AdminPanel>
          <AdminPanel>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Capítulos</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-100">{formatInteger(totalChapters)}</p>
            <p className="mt-1 text-sm text-slate-400">capítulos no recorte</p>
          </AdminPanel>
          <AdminPanel>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Páginas</p>
            <p className="mt-2 text-3xl font-semibold text-violet-100">{formatCompact(totalPages)}</p>
            <p className="mt-1 text-sm text-slate-400">páginas importadas/registradas</p>
          </AdminPanel>
        </div>

        <AdminHubSection eyebrow="Filtro" title="Buscar mangás" description="Filtre por título, slug, autor, artista ou status.">
          <AdminPanel>
            <form className="grid gap-3 lg:grid-cols-[1fr_200px_auto]" method="GET">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Buscar por título, slug, autor ou artista..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todos status</option>
                {statuses.map((s) => <option key={s.status} value={s.status}>{normalizeStatusLabel(s.status)} ({s.c})</option>)}
              </select>
              <div className="flex gap-2">
                <button className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15" type="submit">Buscar</button>
                {(q || status) && <Link href={`/${secretPath}/mangas`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}
              </div>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Catálogo visual" title="Lista de mangás" description="Preview de capa, leitor público, volume de páginas e exclusão com confirmação.">
          {mangas.length === 0 ? (
            <AdminEmptyState icon={Layers3} title="Nenhum mangá encontrado" description="Ajuste a busca ou rode uma importação de mangás." actionHref={`/${secretPath}/upload`} actionLabel="Ir para upload" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mangas.map((manga) => (
                <AdminPanel key={manga.id} className="group overflow-hidden p-0">
                  <div className="flex gap-4 p-4">
                    <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/30">
                      {imageFromRow(manga as any) ? <img src={imageFromRow(manga as any)!} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-slate-600"><ImageIcon className="h-6 w-6" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 font-semibold leading-snug text-slate-100">{manga.title}</h3>
                          <p className="mt-1 truncate text-xs text-slate-500">/{manga.slug}</p>
                        </div>
                        <AdminStatusBadge tone={statusTone(manga.status)}>{normalizeStatusLabel(manga.status)}</AdminStatusBadge>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-400">{truncateText(manga.synopsis, 150) || "Sem sinopse cadastrada."}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-300"><FileText className="mr-1 inline h-3.5 w-3.5" /> {formatInteger(Number(manga.chapter_count || 0))} caps</div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-300"><FileImage className="mr-1 inline h-3.5 w-3.5" /> {formatCompact(Number(manga.page_count || 0))} págs</div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/10 bg-white/[0.02] p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {manga.hidden ? <AdminStatusBadge tone="rose">oculto</AdminStatusBadge> : null}
                      {manga.curated_featured ? <AdminStatusBadge tone="amber">destaque</AdminStatusBadge> : null}
                      {manga.show_on_home ? <AdminStatusBadge tone="cyan">home</AdminStatusBadge> : null}
                      {manga.is_original ? <AdminStatusBadge tone="emerald">original</AdminStatusBadge> : null}
                      {manga.source ? <AdminStatusBadge tone="slate">{manga.source}</AdminStatusBadge> : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500"><Calendar className="mr-1 inline h-3.5 w-3.5" /> {manga.updated_at?.slice(0, 10) || manga.created_at?.slice(0, 10) || "—"}</div>
                      <div className="flex gap-2">
                        <Link href={`/manga/${manga.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.07]"><ExternalLink className="h-3.5 w-3.5" /> Site</Link>
                        <form action={deleteMangaV2Action}>
                          <input type="hidden" name="manga_id" value={manga.id} />
                          <ConfirmSubmitButton variant="danger" message={`Excluir permanentemente o mangá '${manga.title}' com capítulos e páginas?`} title="Excluir mangá">
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </ConfirmSubmitButton>
                        </form>
                      </div>
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
    console.error("Admin mangas V2 error:", error);
    return (
      <div className="min-h-screen bg-[#070812] p-6 text-slate-100">
        <AdminErrorState error={error} backHref={`/${secretPath}`} />
      </div>
    );
  }
}
