import Link from "next/link";
import { AlertTriangle, Check, FileSearch, FileText, Search, Trash2, UploadCloud, XCircle } from "lucide-react";
import { getDb } from "@/lib/db";
import { deleteImportV2Action, markImportCompletedV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatInteger, readSearchParams, safeAll, safeCount, truncateText } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type ImportRow = {
  id: string;
  status?: string;
  file_type?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  original_name?: string;
  detected_title?: string;
  detected_author?: string;
  detected_chapters?: number;
  extracted_content?: string;
  notes?: string;
  error?: string;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
};

function statusTone(status?: string) {
  if (status === "completed") return "emerald" as const;
  if (status === "error") return "rose" as const;
  if (status === "processing") return "blue" as const;
  return "amber" as const;
}

function statusLabel(status?: string) {
  if (status === "completed") return "Concluído";
  if (status === "error") return "Erro";
  if (status === "processing") return "Processando";
  if (status === "review") return "Revisar";
  return "Pendente";
}

function fileSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminAnalisePage(props: { searchParams?: Promise<{ q?: string; status?: string }> | { q?: string; status?: string } }) {
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
      conditions.push("(detected_title LIKE ? OR original_name LIKE ? OR file_name LIKE ? OR extracted_content LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const items = safeAll<ImportRow>(db, `
      SELECT id, status, file_type, file_name, file_path, file_size, original_name, detected_title, detected_author, detected_chapters, extracted_content, notes, error, created_at, updated_at, processed_at
      FROM import_queue
      ${where}
      ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'processing' THEN 1 WHEN 'error' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END, created_at DESC
      LIMIT 80
    `, ...params);

    const pending = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status='pending'");
    const processing = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status='processing'");
    const completed = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status='completed'");
    const errors = safeCount(db, "SELECT COUNT(*) AS c FROM import_queue WHERE status='error'");

    return (
      <AdminHubShell secretPath={secretPath} active="analise" title="Análise de importações" subtitle="Revise, aprove, conclua ou remova arquivos enviados para ingestão." user={user}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pendente</p><p className="mt-2 text-3xl font-semibold text-amber-100">{formatInteger(pending)}</p><p className="mt-1 text-sm text-slate-400">aguardando revisão</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Processando</p><p className="mt-2 text-3xl font-semibold text-blue-100">{formatInteger(processing)}</p><p className="mt-1 text-sm text-slate-400">em andamento</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Concluído</p><p className="mt-2 text-3xl font-semibold text-emerald-100">{formatInteger(completed)}</p><p className="mt-1 text-sm text-slate-400">aprovado/fechado</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Erro</p><p className="mt-2 text-3xl font-semibold text-rose-100">{formatInteger(errors)}</p><p className="mt-1 text-sm text-slate-400">precisa correção</p></AdminPanel>
        </div>

        <AdminHubSection eyebrow="Filtro" title="Fila de importação" description="Use status e busca textual para revisar rapidamente arquivos enviados.">
          <AdminPanel>
            <form method="GET" className="grid gap-3 lg:grid-cols-[1fr_190px_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Título detectado, arquivo ou conteúdo..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="">Todos status</option>
                <option value="pending">Pendente</option>
                <option value="processing">Processando</option>
                <option value="completed">Concluído</option>
                <option value="error">Erro</option>
              </select>
              <div className="flex gap-2"><button type="submit" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">Filtrar</button>{(q || status) && <Link href={`/${secretPath}/analise`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}</div>
            </form>
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Revisão" title="Itens da fila" description="Aprovar marca como concluído; remover exclui o item da fila. Não apaga obras já publicadas.">
          {items.length === 0 ? (
            <AdminEmptyState icon={FileSearch} title="Nenhum item na análise" description="Faça upload de arquivos ou ajuste o filtro." actionHref={`/${secretPath}/upload`} actionLabel="Enviar arquivo" />
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <AdminPanel key={item.id} className={item.status === "error" ? "border-rose-400/20 bg-rose-950/10" : ""}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-cyan-300" />
                        <h3 className="font-semibold text-slate-100">{item.detected_title || item.original_name || item.file_name || item.id}</h3>
                        <AdminStatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</AdminStatusBadge>
                        <AdminStatusBadge tone="slate">{item.file_type?.toUpperCase() || "arquivo"}</AdminStatusBadge>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
                        <span>Arquivo: {item.original_name || item.file_name || "—"}</span>
                        <span>Tamanho: {fileSize(item.file_size)}</span>
                        <span>Capítulos: {item.detected_chapters || 0}</span>
                        <span>Data: {item.created_at?.slice(0, 16) || "—"}</span>
                      </div>
                      {item.error ? <p className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"><XCircle className="mr-1 inline h-4 w-4" /> {item.error}</p> : null}
                      {item.extracted_content ? (
                        <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                          <summary className="cursor-pointer text-sm font-medium text-cyan-200">Prévia do conteúdo extraído</summary>
                          <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{truncateText(item.extracted_content, 5000)}</pre>
                        </details>
                      ) : <p className="mt-3 text-sm text-slate-500">Sem texto extraído neste arquivo/formato.</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      {item.status !== "completed" ? (
                        <form action={markImportCompletedV2Action}>
                          <input type="hidden" name="import_id" value={item.id} />
                          <ConfirmSubmitButton variant="success" message="Marcar esta importação como concluída/aprovada?">
                            <Check className="h-3.5 w-3.5" /> Aprovar
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                      <form action={deleteImportV2Action}>
                        <input type="hidden" name="import_id" value={item.id} />
                        <ConfirmSubmitButton variant="danger" message="Excluir este item da fila de importação?">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </AdminPanel>
              ))}
            </div>
          )}
        </AdminHubSection>

        <AdminHubSection eyebrow="Estados" title="Significado dos badges" description="Status visual padronizado para importações.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminPanel><AdminStatusBadge tone="amber">Pendente</AdminStatusBadge><p className="mt-3 text-sm text-slate-400">Arquivo aguardando análise manual.</p></AdminPanel>
            <AdminPanel><AdminStatusBadge tone="blue">Processando</AdminStatusBadge><p className="mt-3 text-sm text-slate-400">Pipeline extraindo/processando dados.</p></AdminPanel>
            <AdminPanel><AdminStatusBadge tone="emerald">Concluído</AdminStatusBadge><p className="mt-3 text-sm text-slate-400">Revisão finalizada.</p></AdminPanel>
            <AdminPanel><AdminStatusBadge tone="rose">Erro</AdminStatusBadge><p className="mt-3 text-sm text-slate-400">Precisa correção antes de avançar.</p></AdminPanel>
            <AdminPanel><AdminStatusBadge tone="violet">Revisar</AdminStatusBadge><p className="mt-3 text-sm text-slate-400">Preparado para revisão editorial.</p></AdminPanel>
          </div>
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Analise admin V2 error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
