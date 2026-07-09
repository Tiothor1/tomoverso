import Link from "next/link";
import { Calendar, ExternalLink, Headphones, Heart, Music, PauseCircle, PlayCircle, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatCompact, formatInteger, readSearchParams, safeAll, safeCount } from "@/lib/admin/admin-v2-data";
import { ensureTomomusicTables } from "@/lib/tomomusic/service";
import { addManualTomomusicTrackAction, deleteTomomusicTrackAction, toggleTomomusicTrackActiveAction, updateTomomusicTrackAction } from "@/lib/tomomusic/admin-actions";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type TrackRow = {
  id: string;
  title: string;
  artist: string;
  description: string;
  mood: string;
  genre: string;
  duration_seconds: number;
  file_url: string;
  cover_url: string | null;
  source_url: string;
  license_name: string;
  license_url: string;
  attribution_required: number;
  attribution_text: string;
  source: string | null;
  downloaded_at: string | null;
  local_file: string | null;
  bytes: number;
  is_active: number;
  play_count: number;
  like_count: number;
  favorite_count: number;
  created_at: string;
  updated_at: string;
};

function fmtTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtBytes(bytes: number) {
  return `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AdminTomoMusicPage(props: { searchParams?: Promise<{ q?: string; status?: string }> | { q?: string; status?: string } }) {
  const secretPath = getAdminSecretPath();
  const user = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    ensureTomomusicTables(db);
    const sp = await readSearchParams(props.searchParams);
    const q = (sp.q || "").trim();
    const status = (sp.status || "").trim();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (q) {
      conditions.push("(t.title LIKE ? OR t.artist LIKE ? OR t.mood LIKE ? OR t.genre LIKE ? OR t.source_url LIKE ? OR t.license_name LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status === "active") conditions.push("t.is_active = 1");
    if (status === "inactive") conditions.push("t.is_active = 0");
    if (status === "credits") conditions.push("t.attribution_required = 1");
    if (status === "license_missing") conditions.push("(t.license_url = '' OR t.license_name = '' OR t.source_url = '')");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const tracks = safeAll<TrackRow>(db, `
      SELECT t.*,
             (SELECT COUNT(*) FROM tomomusic_favorites f WHERE f.track_id = t.id) AS favorite_count
      FROM tomomusic_tracks t
      ${where}
      ORDER BY t.is_active DESC, t.play_count DESC, t.updated_at DESC
      LIMIT 160
    `, ...params);

    const total = safeCount(db, "SELECT COUNT(*) AS c FROM tomomusic_tracks");
    const active = safeCount(db, "SELECT COUNT(*) AS c FROM tomomusic_tracks WHERE is_active = 1");
    const plays = safeCount(db, "SELECT COUNT(*) AS c FROM tomomusic_plays");
    const likes = safeCount(db, "SELECT COUNT(*) AS c FROM tomomusic_likes");
    const favorites = safeCount(db, "SELECT COUNT(*) AS c FROM tomomusic_favorites");
    const missingLicense = safeCount(db, "SELECT COUNT(*) AS c FROM tomomusic_tracks WHERE license_url = '' OR license_name = '' OR source_url = ''");
    const credits = safeCount(db, "SELECT COUNT(*) AS c FROM tomomusic_tracks WHERE attribution_required = 1");
    const bytes = safeAll<{ c: number }>(db, "SELECT COALESCE(SUM(bytes), 0) AS c FROM tomomusic_tracks WHERE is_active = 1")[0]?.c || 0;

    return (
      <AdminHubShell secretPath={secretPath} active="tomomusic" title="TomoMusic" subtitle="Músicas, licenças, métricas, likes e favoritos do player oficial." user={user}>
        <div className="grid gap-4 md:grid-cols-4">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Músicas</p><p className="mt-2 text-3xl font-semibold text-slate-50">{formatInteger(total)}</p><p className="text-sm text-slate-400">{active} ativas · {fmtBytes(bytes)}</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Plays</p><p className="mt-2 text-3xl font-semibold text-cyan-100">{formatCompact(plays)}</p><p className="text-sm text-slate-400">contagem após 30s</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Engajamento</p><p className="mt-2 text-3xl font-semibold text-amber-100">{formatCompact(likes + favorites)}</p><p className="text-sm text-slate-400">{likes} likes · {favorites} favs</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Licenças</p><p className="mt-2 text-3xl font-semibold text-emerald-100">{missingLicense}</p><p className="text-sm text-slate-400">sem licença clara · {credits} exigem crédito</p></AdminPanel>
        </div>

        <AdminHubSection eyebrow="Filtro" title="Buscar músicas" description="Filtre por título, artista, clima, fonte, licença ou pendências.">
          <AdminPanel>
            <form className="grid gap-3 lg:grid-cols-[1fr_200px_auto]" method="GET">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Buscar música, artista, fonte ou licença..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todas</option><option value="active">Ativas</option><option value="inactive">Inativas</option><option value="credits">Exigem crédito</option><option value="license_missing">Sem licença clara</option>
              </select>
              <div className="flex gap-2"><button className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15" type="submit">Buscar</button>{(q || status) && <Link href={`/${secretPath}/tomomusic`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}</div>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Cadastro manual" title="Adicionar música manualmente" description="Só aceita áudio .mp3, .ogg, .wav ou .m4a com fonte e licença claras. Upload público continua bloqueado.">
          <AdminPanel>
            <form action={addManualTomomusicTrackAction} className="grid gap-3 lg:grid-cols-2">
              <input name="title" required placeholder="Título" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <input name="artist" required placeholder="Artista" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <input name="file_url" required placeholder="/audio/tomomusic/tracks/arquivo.mp3" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none lg:col-span-2" />
              <input name="source_url" required placeholder="Link da fonte" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <input name="license_url" required placeholder="Link da licença" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <input name="license_name" required placeholder="Tipo de licença" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <input name="mood" placeholder="clima: reading, lofi, rain..." className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <input name="genre" placeholder="gênero" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <input name="duration_seconds" placeholder="duração em segundos" className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none" />
              <textarea name="attribution_text" placeholder="Texto de atribuição obrigatório" className="min-h-24 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none lg:col-span-2" />
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="attribution_required" defaultChecked /> Exige crédito</label>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/15"><Plus className="h-4 w-4" /> Adicionar</button>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Catálogo" title="Músicas cadastradas" description="Editar metadados, ativar/desativar, conferir fonte e licença.">
          <div className="grid gap-4 xl:grid-cols-2">
            {tracks.map((track) => (
              <AdminPanel key={track.id} className="overflow-hidden p-0">
                <div className="flex gap-4 p-4">
                  {track.cover_url ? <img src={track.cover_url} alt="" className="h-28 w-28 shrink-0 rounded-2xl object-cover" /> : <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Music className="h-6 w-6" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0"><h3 className="truncate font-semibold text-slate-100">{track.title}</h3><p className="truncate text-sm text-slate-400">{track.artist}</p></div>
                      <AdminStatusBadge tone={track.is_active ? "emerald" : "rose"}>{track.is_active ? "ativa" : "inativa"}</AdminStatusBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span><Headphones className="mr-1 inline h-3.5 w-3.5" /> {fmtTime(track.duration_seconds)}</span>
                      <span><PlayCircle className="mr-1 inline h-3.5 w-3.5" /> {track.play_count} plays</span>
                      <span><Heart className="mr-1 inline h-3.5 w-3.5" /> {track.favorite_count} favs</span>
                      <span>{fmtBytes(track.bytes)}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">{track.description}</p>
                  </div>
                </div>
                <div className="border-t border-white/10 bg-white/[0.02] p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <AdminStatusBadge tone="blue">{track.mood}</AdminStatusBadge>
                    <AdminStatusBadge tone="slate">{track.genre}</AdminStatusBadge>
                    {track.attribution_required ? <AdminStatusBadge tone="amber">exige crédito</AdminStatusBadge> : <AdminStatusBadge tone="emerald">sem crédito</AdminStatusBadge>}
                    {(!track.license_url || !track.source_url) ? <AdminStatusBadge tone="rose">licença pendente</AdminStatusBadge> : <AdminStatusBadge tone="emerald"><ShieldCheck className="mr-1 inline h-3 w-3" /> licença clara</AdminStatusBadge>}
                  </div>
                  <details className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-200">Editar metadados</summary>
                    <form action={updateTomomusicTrackAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="track_id" value={track.id} />
                      <input name="title" defaultValue={track.title} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm" />
                      <input name="artist" defaultValue={track.artist} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm" />
                      <div className="grid gap-2 sm:grid-cols-2"><input name="mood" defaultValue={track.mood} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm" /><input name="genre" defaultValue={track.genre} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm" /></div>
                      <textarea name="description" defaultValue={track.description} className="min-h-20 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm" />
                      <button type="submit" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100">Salvar</button>
                    </form>
                  </details>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500">
                    <p><Calendar className="mr-1 inline h-3.5 w-3.5" /> baixado em {track.downloaded_at?.slice(0, 10) || "—"} · arquivo: {track.local_file || track.file_url}</p>
                    <p>Licença: <a href={track.license_url} target="_blank" rel="noopener noreferrer" className="text-amber-200 hover:text-amber-100">{track.license_name}</a> · Fonte: <a href={track.source_url} target="_blank" rel="noopener noreferrer" className="text-amber-200 hover:text-amber-100"><ExternalLink className="mr-1 inline h-3.5 w-3.5" /> abrir</a></p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={toggleTomomusicTrackActiveAction}><input type="hidden" name="track_id" value={track.id} /><button type="submit" className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.07]">{track.is_active ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />} {track.is_active ? "Desativar" : "Ativar"}</button></form>
                    <form action={deleteTomomusicTrackAction}><input type="hidden" name="track_id" value={track.id} /><ConfirmSubmitButton variant="danger" message={`Remover '${track.title}' do TomoMusic?`} title="Remover música"><Trash2 className="h-3.5 w-3.5" /> Remover</ConfirmSubmitButton></form>
                  </div>
                </div>
              </AdminPanel>
            ))}
          </div>
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Admin TomoMusic error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
